using Hangfire.PostgreSql;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;
using Npgsql;
using System.Text.RegularExpressions;

namespace NetFilmx_Web.Runtime;

public static class ReleaseDatabase
{
    public const long MigrationLockId = 0x4E657446696C6D;
    public static readonly int HangfireSchemaVersion = typeof(PostgreSqlStorage).Assembly.GetManifestResourceNames()
        .Select(name => Regex.Match(name, @"\.Install\.v(\d+)\.sql$"))
        .Where(match => match.Success).Select(match => int.Parse(match.Groups[1].Value)).Max();

    public static async Task MigrateAsync(string connectionString, bool prepareQueue, CancellationToken token = default)
    {
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(token);
        deadline.CancelAfter(TimeSpan.FromMinutes(2));
        token = deadline.Token;
        if (connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase))
        {
            var settings = new NpgsqlConnectionStringBuilder(connectionString)
            {
                Pooling = false, Timeout = 5, CommandTimeout = 60,
                Options = "-c lock_timeout=5000 -c statement_timeout=60000"
            };
            await using var connection = new NpgsqlConnection(settings.ConnectionString);
            await connection.OpenAsync(token);
            await using (var acquire = new NpgsqlCommand("SELECT pg_try_advisory_lock(@id)", connection))
            {
                acquire.Parameters.AddWithValue("id", MigrationLockId);
                if (!true.Equals(await acquire.ExecuteScalarAsync(token)))
                    throw new InvalidOperationException("Another release migration owns this database.");
            }
            // A nonpooled session owns the release lock until disposal, including
            // application and Hangfire schema preparation. Never run a web host.
            await using var db = new NetFilmxDbContext(new DbContextOptionsBuilder<NetFilmxDbContext>()
                .UseNpgsql(connection, options => options.MigrationsAssembly(NetFilmxDatabaseOptions.PostgreSqlMigrationsAssembly))
                .Options);
            await EnsureKnownHistoryAsync(db, token);
            if (prepareQueue) await EnsureQueueCanUpgradeAsync(connection, token);
            await db.Database.MigrateAsync(token);
            if (prepareQueue)
            {
                // The pinned installer is synchronous. Close its nonpooled session
                // on cancellation; server statement/lock timeouts also bound waits.
                using var cancel = token.Register(() => { try { connection.Close(); } catch { } });
                PostgreSqlObjectsInstaller.Install(connection);
                token.ThrowIfCancellationRequested();
                await EnsureQueueReadyAsync(connection, token);
            }
        }
        else
        {
            if (prepareQueue) throw new InvalidOperationException("Hangfire schema requires PostgreSQL.");
            var settings = new SqliteConnectionStringBuilder(connectionString);
            if (!Path.IsPathFullyQualified(settings.DataSource))
                throw new InvalidOperationException("Offline SQLite migration requires an absolute database file.");
            if (!Directory.Exists(Path.GetDirectoryName(settings.DataSource)))
                throw new InvalidOperationException("The SQLite database parent directory must already exist.");
            var lockPath = settings.DataSource + ".migration.lock";
            if (File.Exists(lockPath) && (File.GetAttributes(lockPath) & FileAttributes.ReparsePoint) != 0)
                throw new InvalidOperationException("SQLite migration locks must not be symbolic links.");
            var fileOptions = new FileStreamOptions { Mode = FileMode.OpenOrCreate, Access = FileAccess.ReadWrite, Share = FileShare.None };
            if (!OperatingSystem.IsWindows()) fileOptions.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
            using var lease = new FileStream(lockPath, fileOptions);
            settings.Pooling = false;
            settings.DefaultTimeout = 5;
            await using var db = new NetFilmxDbContext(new DbContextOptionsBuilder<NetFilmxDbContext>()
                .UseSqlite(settings.ConnectionString).Options);
            await EnsureKnownHistoryAsync(db, token);
            await db.Database.MigrateAsync(token);
        }
    }

    private static async Task EnsureKnownHistoryAsync(NetFilmxDbContext db, CancellationToken token)
    {
        var known = db.Database.GetMigrations().ToArray();
        var applied = (await db.Database.GetAppliedMigrationsAsync(token)).ToArray();
        if (!applied.SequenceEqual(known.Take(applied.Length), StringComparer.Ordinal))
            throw new InvalidOperationException("Database migration history is newer or incompatible with this release.");
    }

    public static async Task EnsureReadyAsync(NetFilmxDbContext db, bool requireQueue, CancellationToken token = default)
    {
        if (!db.Database.IsRelational()) throw new InvalidOperationException("Readiness requires a relational database.");
        db.Database.SetCommandTimeout(5);
        if (db.Database.IsSqlite())
        {
            ((SqliteConnection)db.Database.GetDbConnection()).DefaultTimeout = 5;
            var settings = new SqliteConnectionStringBuilder(db.Database.GetConnectionString());
            if (!File.Exists(settings.DataSource)) throw new InvalidOperationException("SQLite database is missing; migrate explicitly.");
        }
        if (!await db.Database.CanConnectAsync(token)) throw new InvalidOperationException("Database is unavailable.");
        await EnsureKnownHistoryAsync(db, token);
        if ((await db.Database.GetPendingMigrationsAsync(token)).Any())
            throw new InvalidOperationException("Pending migrations: run the explicit release migration before starting the application.");
        // Check actual required columns, even with an empty catalogue.
        await db.Videos.AsNoTracking().Take(1).ToArrayAsync(token);
        await db.Users.AsNoTracking().Take(1).ToArrayAsync(token);
        if (requireQueue)
        {
            if (!db.Database.IsNpgsql()) throw new InvalidOperationException("Enabled uploads require PostgreSQL.");
            await db.Database.OpenConnectionAsync(token);
            try { await EnsureQueueReadyAsync((NpgsqlConnection)db.Database.GetDbConnection(), token); }
            finally { await db.Database.CloseConnectionAsync(); }
        }
    }

    private static async Task EnsureQueueReadyAsync(NpgsqlConnection connection, CancellationToken token)
    {
        await using var version = new NpgsqlCommand("SELECT version FROM hangfire.schema", connection) { CommandTimeout = 5 };
        var versions = new List<int>();
        await using (var reader = await version.ExecuteReaderAsync(token))
            while (await reader.ReadAsync(token)) versions.Add(reader.GetInt32(0));
        if (versions.Count != 1 || versions[0] != HangfireSchemaVersion)
            throw new InvalidOperationException("Hangfire schema is missing or incompatible; prepare it in the explicit release operation.");
        await using var queue = new NpgsqlCommand("SELECT id FROM hangfire.jobqueue LIMIT 1", connection) { CommandTimeout = 5 };
        await queue.ExecuteScalarAsync(token);
    }

    private static async Task EnsureQueueCanUpgradeAsync(NpgsqlConnection connection, CancellationToken token)
    {
        await using var exists = new NpgsqlCommand("SELECT to_regclass('hangfire.schema') IS NOT NULL", connection);
        if (!true.Equals(await exists.ExecuteScalarAsync(token))) return;
        await using var version = new NpgsqlCommand("SELECT version FROM hangfire.schema", connection);
        var versions = new List<int>();
        await using (var reader = await version.ExecuteReaderAsync(token))
            while (await reader.ReadAsync(token)) versions.Add(reader.GetInt32(0));
        if (versions.Count != 1 || versions[0] < 1 || versions[0] > HangfireSchemaVersion)
            throw new InvalidOperationException("Hangfire schema cannot be upgraded by this release.");
    }
}
