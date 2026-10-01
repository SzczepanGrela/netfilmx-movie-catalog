using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;
using Npgsql;
using NetFilmx_Storage.PostgreSql.Catalogue;
using Hangfire;
using Hangfire.PostgreSql;
using NetFilmx_Web.Services;

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
