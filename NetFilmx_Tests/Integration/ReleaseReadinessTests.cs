using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using NetFilmx_Storage.Context;
using NetFilmx_Tests.Integration.Fixtures;
using NetFilmx_Web.Runtime;

namespace NetFilmx_Tests.Integration;

public sealed class ReleaseReadinessTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "netfilmx-release-tests-" + Guid.NewGuid().ToString("N"));
    private string FilePath => Path.Combine(_directory, "test.db");
    private string Connection => "Data Source=" + FilePath + ";Pooling=false";
    public ReleaseReadinessTests() => Directory.CreateDirectory(_directory);
    private NetFilmxDbContext Database() => new(new DbContextOptionsBuilder<NetFilmxDbContext>().UseSqlite(Connection).Options);

    [Fact]
    public void MissingDatabase_StopsWebStartupWithoutCreatingIt()
    {
        using var factory = new TestWebApplicationFactory<Program>(FilePath, null, prepareDatabase: false);
        Assert.Throws<InvalidOperationException>(() => factory.CreateClient());
        Assert.False(File.Exists(FilePath));
    }

    [Fact]
    public async Task PendingMigrations_StopStartupWithoutApplyingThem()
    {
        await using (var db = Database())
            await db.GetService<IMigrator>().MigrateAsync("20260728210152_InitialSqlite");
        using var factory = new TestWebApplicationFactory<Program>(FilePath, null, prepareDatabase: false);
        Assert.Throws<InvalidOperationException>(() => factory.CreateClient());
        await using var read = Database();
        Assert.Single(await read.Database.GetAppliedMigrationsAsync());
    }

    [Fact]
    public async Task ExplicitSqliteMigration_IsRepeatableAndSchemaIsReady()
    {
        await ReleaseDatabase.MigrateAsync(Connection, prepareQueue: false);
        await using var db = Database();
        await ReleaseDatabase.EnsureReadyAsync(db, requireQueue: false);
        var history = (await db.Database.GetAppliedMigrationsAsync()).ToArray();
        await ReleaseDatabase.MigrateAsync(Connection, prepareQueue: false);
        Assert.Equal(history, (await db.Database.GetAppliedMigrationsAsync()).ToArray());
        await Assert.ThrowsAsync<InvalidOperationException>(() => ReleaseDatabase.MigrateAsync(Connection, prepareQueue: true));
    }

    [Fact]
    public async Task SqliteMigrationRace_RejectsOtherOwnerAndCanRetryAfterRelease()
    {
        using (var lease = new FileStream(FilePath + ".migration.lock", FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None))
        {
            await Assert.ThrowsAsync<IOException>(() => ReleaseDatabase.MigrateAsync(Connection, prepareQueue: false));
            Assert.False(File.Exists(FilePath));
        }
        await ReleaseDatabase.MigrateAsync(Connection, prepareQueue: false);
        await using var db = Database();
        await ReleaseDatabase.EnsureReadyAsync(db, requireQueue: false);
    }

    [Fact]
    public async Task NewerHistory_RejectsReadinessAndMigrationWithoutDowngrade()
    {
        await ReleaseDatabase.MigrateAsync(Connection, prepareQueue: false);
        await using var db = Database();
        await db.Database.ExecuteSqlRawAsync("INSERT INTO \"__EFMigrationsHistory\" VALUES ('20990101000000_Future', '99.0.0')");
        await Assert.ThrowsAsync<InvalidOperationException>(() => ReleaseDatabase.EnsureReadyAsync(db, false));
        await Assert.ThrowsAsync<InvalidOperationException>(() => ReleaseDatabase.MigrateAsync(Connection, false));
        Assert.Contains("20990101000000_Future", await db.Database.GetAppliedMigrationsAsync());
    }

    [Fact]
    public async Task HealthReportsRevision_AndReadinessFailsWhenDependencyBreaks()
    {
        using var factory = new TestWebApplicationFactory<Program>();
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        using var ready = await client.GetAsync("/health/ready");
        Assert.Equal(HttpStatusCode.OK, ready.StatusCode);
        Assert.True(ready.Headers.CacheControl?.NoStore);
        var body = await ready.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ready", body.GetProperty("status").GetString());
        Assert.Equal(ReleaseHealth.Revision, body.GetProperty("revision").GetString());
        using (var scope = factory.Services.CreateScope())
            await scope.ServiceProvider.GetRequiredService<NetFilmxDbContext>().Database.ExecuteSqlRawAsync("DROP TABLE \"Videos\"");
        using var failed = await client.GetAsync("/health/ready");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, failed.StatusCode);
        Assert.True(failed.Headers.CacheControl?.NoStore);
        Assert.Equal("unavailable", (await failed.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString());
        using var live = await client.GetAsync("/health/live");
        Assert.Equal(HttpStatusCode.OK, live.StatusCode);
    }

    public void Dispose() => Directory.Delete(_directory, recursive: true);
}
