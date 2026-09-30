using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;
using Npgsql;

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
    public async Task Migrate_CreatesEmptySchema_AndCanRunAgainWithoutChangingData()
    {
        await using var db = OpenContext();
        await db.Database.MigrateAsync();
        var migrations = (await db.Database.GetAppliedMigrationsAsync()).ToArray();
        Assert.Single(migrations);
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
