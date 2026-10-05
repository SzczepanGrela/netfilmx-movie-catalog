using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;
using Npgsql;
using NetFilmx_Storage.PostgreSql.Catalogue;
using Hangfire;
using Hangfire.PostgreSql;
using NetFilmx_Web.Services;
using NetFilmx_Web.Runtime;
using NetFilmx_Service.Processing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace NetFilmx_Tests.Integration;

// CI supplies a disposable PostgreSQL service. Each test creates its own database;
// the connection's existing database is never migrated, seeded or dropped.
public sealed class PostgreSqlMigrationTests : IAsyncLifetime
{
    private readonly string _database = "netfilmx_test_" + Guid.NewGuid().ToString("N");
    private string? _adminConnection;
    private string? _testConnection;
    private bool _created;

    public async Task InitializeAsync()
    {
        var configured = Environment.GetEnvironmentVariable("NETFILMX_TEST_POSTGRES");
        if (string.IsNullOrWhiteSpace(configured)) return;

        var options = new NpgsqlConnectionStringBuilder(configured) { Pooling = false };
        _adminConnection = options.ConnectionString;
        await using var connection = new NpgsqlConnection(_adminConnection);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand($"CREATE DATABASE {_database}", connection);
        await command.ExecuteNonQueryAsync();
        _created = true;
        options.Database = _database;
        _testConnection = options.ConnectionString;
    }

    private NetFilmxDbContext OpenContext() => new(
        new DbContextOptionsBuilder<NetFilmxDbContext>()
            .UseNetFilmxDatabase(_testConnection ?? throw new InvalidOperationException("Test database is not configured."))
            .Options);

    [PostgreSqlFact]
    public async Task ExplicitReleaseMigration_PreparesApplicationAndQueueWithoutWorkers()
    {
        await ReleaseDatabase.MigrateAsync(_testConnection!, prepareQueue: true);
        await using var db = OpenContext();
        await ReleaseDatabase.EnsureReadyAsync(db, requireQueue: true);
        Assert.False(await db.Videos.AnyAsync());
        Assert.False(await db.Users.AnyAsync());
        await ReleaseDatabase.MigrateAsync(_testConnection!, prepareQueue: true);
        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
        await using var connection = new NpgsqlConnection(_testConnection);
        await connection.OpenAsync();
        await using var servers = new NpgsqlCommand("SELECT count(*) FROM hangfire.server", connection);
        Assert.Equal(0L, await servers.ExecuteScalarAsync());
    }

    [PostgreSqlFact]
    public async Task MigrationRace_RejectsOtherSessionAndSucceedsAfterLockRelease()
    {
        await using var owner = new NpgsqlConnection(_testConnection);
        await owner.OpenAsync();
        await using var acquire = new NpgsqlCommand("SELECT pg_advisory_lock(@id)", owner);
        acquire.Parameters.AddWithValue("id", ReleaseDatabase.MigrationLockId);
        await acquire.ExecuteNonQueryAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => ReleaseDatabase.MigrateAsync(_testConnection!, false));
        await using (var db = OpenContext()) Assert.Empty(await db.Database.GetAppliedMigrationsAsync());
        await owner.CloseAsync();
        await ReleaseDatabase.MigrateAsync(_testConnection!, false);
        await using var read = OpenContext();
        await ReleaseDatabase.EnsureReadyAsync(read, false);
    }

    [PostgreSqlFact]
    public async Task QueueReadiness_RejectsMissingOrNewerSchemaWithoutInstallingIt()
    {
        await ReleaseDatabase.MigrateAsync(_testConnection!, false);
        await using var db = OpenContext();
        await Assert.ThrowsAsync<PostgresException>(() => ReleaseDatabase.EnsureReadyAsync(db, true));
        await ReleaseDatabase.MigrateAsync(_testConnection!, true);
        await db.Database.ExecuteSqlRawAsync("UPDATE hangfire.schema SET version = 999");
        await Assert.ThrowsAsync<InvalidOperationException>(() => ReleaseDatabase.EnsureReadyAsync(db, true));
        await Assert.ThrowsAsync<InvalidOperationException>(() => ReleaseDatabase.MigrateAsync(_testConnection!, true));
    }

    [PostgreSqlFact]
    public async Task FailedDdl_RollsBackMigrationAndReleasesReleaseLock()
    {
        await using var db = OpenContext();
        await db.Database.ExecuteSqlRawAsync("CREATE TABLE \"Videos\" (id integer)");
        await Assert.ThrowsAsync<PostgresException>(() => ReleaseDatabase.MigrateAsync(_testConnection!, false));
        Assert.Empty(await db.Database.GetAppliedMigrationsAsync());
        await db.Database.ExecuteSqlRawAsync("DROP TABLE \"Videos\"");
        await ReleaseDatabase.MigrateAsync(_testConnection!, false);
        await ReleaseDatabase.EnsureReadyAsync(db, false);
    }

    [PostgreSqlFact]
    public async Task CancelledRelease_DoesNotApplyMigrationsAndReleasesOwnership()
    {
        using var cancelled = new CancellationTokenSource();
        cancelled.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => ReleaseDatabase.MigrateAsync(_testConnection!, true, cancelled.Token));
        await using (var db = OpenContext()) Assert.Empty(await db.Database.GetAppliedMigrationsAsync());
        await ReleaseDatabase.MigrateAsync(_testConnection!, true);
        await using var read = OpenContext();
        await ReleaseDatabase.EnsureReadyAsync(read, true);
    }

    [PostgreSqlFact]
    public async Task TwoWorkerHosts_StartOneServerAndTransferOwnershipAfterShutdown()
    {
        await ReleaseDatabase.MigrateAsync(_testConnection!, true);
        var path = Path.Combine(Path.GetTempPath(), "netfilmx-worker-lease-" + Guid.NewGuid().ToString("N"));
        if (OperatingSystem.IsWindows()) Directory.CreateDirectory(path);
        else Directory.CreateDirectory(path, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        var options = new PostgreSqlStorageOptions { PrepareSchemaIfNecessary = false };
        var storage = new PostgreSqlStorage(new Hangfire.PostgreSql.Factories.NpgsqlConnectionFactory(_testConnection, options), options);
        using var services = new ServiceCollection().AddLogging()
            .AddDbContext<NetFilmxDbContext>(o => NetFilmxDatabaseOptions.Configure(o, _testConnection!)).BuildServiceProvider();
        using var first = new SingletonUploadWorker(new UploadStagingStore(true, path), storage,
            services.GetRequiredService<IServiceScopeFactory>(), services.GetRequiredService<ILogger<SingletonUploadWorker>>());
        using var second = new SingletonUploadWorker(new UploadStagingStore(true, path), storage,
            services.GetRequiredService<IServiceScopeFactory>(), services.GetRequiredService<ILogger<SingletonUploadWorker>>());
        try
        {
            await first.StartAsync(CancellationToken.None);
            await WaitForAsync(() => first.IsOwner && storage.GetMonitoringApi().Servers().Count == 1);
            await second.StartAsync(CancellationToken.None);
            await Task.Delay(600);
            Assert.False(second.IsOwner);
            Assert.Single(storage.GetMonitoringApi().Servers());
            await first.StopAsync(CancellationToken.None);
            await WaitForAsync(() => second.IsOwner && storage.GetMonitoringApi().Servers().Count == 1);
            Assert.False(first.IsOwner);
            await second.StopAsync(CancellationToken.None);
            Assert.Empty(storage.GetMonitoringApi().Servers());
            Assert.True(File.Exists(Path.Combine(path, ".server.lock")));
        }
        finally
        {
            await first.StopAsync(CancellationToken.None);
            await second.StopAsync(CancellationToken.None);
            Directory.Delete(path, recursive: true);
        }
    }

    private static async Task WaitForAsync(Func<bool> predicate)
    {
        using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        while (!predicate()) await Task.Delay(50, deadline.Token);
    }

    [PostgreSqlFact]
    public async Task ConcurrentRefresh_OnlyOneTransactionConsumesTheToken()
    {
        int sessionId, userId;
        var expiry = DateTime.UtcNow.AddDays(30);
        await using (var db = OpenContext())
        {
            await db.Database.MigrateAsync();
            var user = new User("refresh-race", "race@example.test", "test-hash");
            db.Users.Add(user);
            await db.SaveChangesAsync();
            userId = user.Id;
            var session = new UserSession(userId, "original", expiry);
            db.UserSessions.Add(session);
            await db.SaveChangesAsync();
            sessionId = session.Id;
        }
        await using var first = OpenContext();
        await using var second = OpenContext();
        var repo1 = new NetFilmx_Storage.Repositories.UserSessionRepository(first);
        var repo2 = new NetFilmx_Storage.Repositories.UserSessionRepository(second);
        // Both requests have read the valid old session before either consumes it.
        Assert.NotNull(await repo1.GetByRefreshTokenHashAsync("original"));
        Assert.NotNull(await repo2.GetByRefreshTokenHashAsync("original"));
        var results = await Task.WhenAll(
            repo1.TryRotateSessionAsync(sessionId, new UserSession(userId, "replacement-1", expiry), DateTime.UtcNow),
            repo2.TryRotateSessionAsync(sessionId, new UserSession(userId, "replacement-2", expiry), DateTime.UtcNow));
        Assert.Single(results.Where(result => result));
        await using var read = OpenContext();
        Assert.Equal(2, await read.UserSessions.CountAsync());
        Assert.Equal(1, await read.UserSessions.CountAsync(s => !s.IsRevoked));
        Assert.True((await read.UserSessions.SingleAsync(s => s.Id == sessionId)).IsRevoked);
    }

    [PostgreSqlFact]
    public async Task FailedReplacementInsert_RollsBackTokenConsumption()
    {
        int sessionId, userId;
        var expiry = DateTime.UtcNow.AddDays(7);
        await using (var db = OpenContext())
        {
            await db.Database.MigrateAsync();
            var user = new User("refresh-rollback", "rollback@example.test", "test-hash");
            db.Users.Add(user);
            await db.SaveChangesAsync();
            userId = user.Id;
            var session = new UserSession(userId, "original", expiry);
            db.UserSessions.Add(session);
            await db.SaveChangesAsync();
            sessionId = session.Id;
        }
        await using (var db = OpenContext())
        {
            var repo = new NetFilmx_Storage.Repositories.UserSessionRepository(db);
            await Assert.ThrowsAsync<DbUpdateException>(() => repo.TryRotateSessionAsync(sessionId,
                new UserSession(userId, null!, expiry), DateTime.UtcNow));
        }
        await using var read = OpenContext();
        Assert.Equal(1, await read.UserSessions.CountAsync());
        Assert.False((await read.UserSessions.SingleAsync()).IsRevoked);
    }

    [PostgreSqlFact]
    public async Task UploadIntentAndQueue_SurviveNewDatabaseAndQueueConnections()
    {
        string uploadId = Guid.NewGuid().ToString("N");
        await using (var db = OpenContext())
        {
            await db.Database.MigrateAsync();
            db.Videos.Add(new Video("Upload", "Retained source", 1, "PROCESSING", "/cover.jpg") { SourceUploadId = uploadId });
            await db.SaveChangesAsync();
        }
        await using (var connection = new NpgsqlConnection(_testConnection))
        {
            var options = new PostgreSqlStorageOptions();
            var storage = new PostgreSqlStorage(new Hangfire.PostgreSql.Factories.ExistingNpgsqlConnectionFactory(connection, options), options);
            await using var db = OpenContext();
            await UploadDispatcher.DispatchAsync(db, new BackgroundJobClient(storage), CancellationToken.None);
        }
        await using var readDb = OpenContext();
        var saved = await readDb.Videos.SingleAsync();
        Assert.Equal(uploadId, saved.SourceUploadId);
        Assert.NotNull(saved.UploadJobId);
        await using var reopened = new NpgsqlConnection(_testConnection);
        var reopenedOptions = new PostgreSqlStorageOptions();
        var reopenedStorage = new PostgreSqlStorage(new Hangfire.PostgreSql.Factories.ExistingNpgsqlConnectionFactory(reopened, reopenedOptions), reopenedOptions);
        using var queue = reopenedStorage.GetConnection();
        var job = queue.GetJobData(saved.UploadJobId);
        Assert.Equal(typeof(VideoJobRunner), job.Job.Type);
        Assert.Equal(saved.Id, job.Job.Args[0]);
        Assert.Equal(uploadId, job.Job.Args[1]);
        Assert.Equal("video", queue.GetStateData(saved.UploadJobId).Data["Queue"]);
    }

    [PostgreSqlFact]
    public async Task Migrate_CreatesEmptySchema_AndCanRunAgainWithoutChangingData()
    {
        await using var db = OpenContext();
        await db.Database.MigrateAsync();
        var migrations = (await db.Database.GetAppliedMigrationsAsync()).ToArray();
        Assert.Equal(2, migrations.Length);
        Assert.EndsWith("_InitialPostgreSql", migrations[0]);
        Assert.False(await db.Users.AnyAsync());
        Assert.False(await db.Videos.AnyAsync());
        Assert.False(db.Database.HasPendingModelChanges());

        var video = new Video("Existing media", "Test catalogue entry", 2.50m,
            "https://media.example.test/existing/master.m3u8", "https://media.example.test/cover.jpg");
        db.Videos.Add(video);
        await db.SaveChangesAsync();
        Assert.True(video.Id > 0);
        await db.Database.MigrateAsync();
        db.ChangeTracker.Clear();
        var saved = await db.Videos.SingleAsync();
        Assert.Equal(video.VideoUrl, saved.VideoUrl);
        Assert.Equal(2.50m, saved.Price);
        Assert.Equal(DateTimeKind.Utc, saved.CreatedAt.Kind);
        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
    }

    [PostgreSqlFact]
    public async Task MigratedSchema_SupportsRelationsAndEnforcesUniqueTranslations()
    {
        await using var db = OpenContext();
        await db.Database.MigrateAsync();
        var video = new Video("Film", "Description", 0, "/media/master.m3u8", "/media/cover.jpg");
        video.Categories.Add(new Category("Animation", null));
        video.Tags.Add(new Tag("Short"));
        var user = new User("test-user", "test@example.test", "test-only-hash");
        db.AddRange(video, user);
        await db.SaveChangesAsync();
        db.VideoTranslations.Add(new VideoTranslation(video.Id, "pl", "Film po polsku"));
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var loaded = await db.Videos.Include(v => v.Categories).Include(v => v.Tags)
            .Include(v => v.Translations).SingleAsync();
        Assert.Single(loaded.Categories);
        Assert.Single(loaded.Tags);
        Assert.Equal("Film po polsku", loaded.GetLocalizedTitle("pl"));

        db.VideoTranslations.Add(new VideoTranslation(video.Id, "pl", "Duplicate"));
        var error = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        Assert.Equal(PostgresErrorCodes.UniqueViolation, Assert.IsType<PostgresException>(error.InnerException).SqlState);
        db.ChangeTracker.Clear();
        db.Videos.Remove(await db.Videos.SingleAsync());
        await db.SaveChangesAsync();
        Assert.False(await db.VideoTranslations.AnyAsync());
    }

    [PostgreSqlFact]
    public async Task CatalogueImport_CreatesRetainedLinks_AndRefusesRepeatWithoutChangingData()
    {
        await using var db = OpenContext();
        await db.Database.MigrateAsync();
        var plan = ReadyTestCatalogue();
        await CatalogueImporter.ImportAsync(db, plan, "https://media.example.test");
        db.ChangeTracker.Clear();
        Assert.Equal(7, await db.Videos.CountAsync());
        Assert.False(await db.Users.AnyAsync());
        Assert.False(await db.Bundles.AnyAsync());
        Assert.Equal(3, (await db.Series.Include(s => s.Videos).SingleAsync()).Videos.Count);
        var originals = await db.Videos.OrderBy(v => v.Id).Select(v => v.VideoUrl).ToArrayAsync();
        Assert.All(originals, url => Assert.StartsWith("https://media.example.test/videos/", url));
        Assert.Equal("https://media.example.test/videos/caminandes-gran-dillama.mp4",
            (await db.Videos.SingleAsync(v => v.Title == "Caminandes: Gran Dillama")).VideoUrl);
        Assert.All(await db.Videos.ToArrayAsync(), video => Assert.Equal(DateTimeKind.Utc, video.CreatedAt.Kind));

        await Assert.ThrowsAsync<CatalogueImportException>(() =>
            CatalogueImporter.ImportAsync(db, plan, "https://other.example.test"));
        Assert.Equal(originals, await db.Videos.OrderBy(v => v.Id).Select(v => v.VideoUrl).ToArrayAsync());
        var maxId = await db.Videos.MaxAsync(v => v.Id);
        var next = new Video("Additional film", "Test", 0, "/next.mp4", "/next.jpg");
        db.Videos.Add(next);
        await db.SaveChangesAsync();
        Assert.True(next.Id > maxId);
    }

    [PostgreSqlFact]
    public async Task CatalogueImport_RefusesUnpreparedMediaAndExistingAccounts()
    {
        await using var db = OpenContext();
        await db.Database.MigrateAsync();
        await Assert.ThrowsAsync<CatalogueImportException>(() =>
            CatalogueImporter.ImportAsync(db, CataloguePlan.Load(), "https://media.example.test"));
        Assert.False(await db.Videos.AnyAsync());
        Assert.False(await db.Series.AnyAsync());
        db.Users.Add(new User("retained-user", "retained@example.test", "test-only-hash"));
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<CatalogueImportException>(() =>
            CatalogueImporter.ImportAsync(db, ReadyTestCatalogue(), "https://media.example.test"));
        Assert.Equal("retained-user", (await db.Users.SingleAsync()).Username);
        Assert.False(await db.Videos.AnyAsync());
        Assert.False(await db.Series.AnyAsync());
    }

    private static CataloguePlan ReadyTestCatalogue()
    {
        var plan = CataloguePlan.Load();
        // Synthetic derivative paths in a disposable DB, never a claim that
        // those missing production objects were uploaded or verified.
        return plan with
        {
            Videos = plan.Videos.Select(v => v.PlaybackObjectKey is null
                ? v with { PlaybackObjectKey = $"videos/test-derivatives/{v.Slug}.mp4" } : v).ToArray()
        };
    }

    [PostgreSqlFact]
    public async Task CatalogueImport_RollsBackAllRowsWhenAnInsertFails()
    {
        await using var db = OpenContext();
        await db.Database.MigrateAsync();
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE "Videos" ADD CONSTRAINT test_catalogue_failure CHECK ("Title" <> 'Charge')
            """);
        await Assert.ThrowsAsync<DbUpdateException>(() =>
            CatalogueImporter.ImportAsync(db, ReadyTestCatalogue(), "https://media.example.test"));
        db.ChangeTracker.Clear();
        Assert.False(await db.Videos.AnyAsync());
        Assert.False(await db.Series.AnyAsync());
    }

    public async Task DisposeAsync()
    {
        if (!_created) return;
        await using var connection = new NpgsqlConnection(_adminConnection);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand($"DROP DATABASE {_database} WITH (FORCE)", connection);
        await command.ExecuteNonQueryAsync();
    }
}

public sealed class PostgreSqlFactAttribute : FactAttribute
{
    public PostgreSqlFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("NETFILMX_TEST_POSTGRES")))
            Skip = "Set NETFILMX_TEST_POSTGRES to a disposable PostgreSQL test service (required in CI).";
    }
}
