using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;

namespace NetFilmx_Tests.Integration;

public sealed class SqliteMigrationTests
{
    [Fact]
    public async Task LegacySqlite_UpgradePreservesMediaLinks_AndAddsTranslations()
    {
        await using var db = new NetFilmxDbContext(new DbContextOptionsBuilder<NetFilmxDbContext>()
            .UseNetFilmxDatabase("Data Source=:memory:").Options);
        await db.Database.OpenConnectionAsync();
        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync("20260807090211_ArgonPasswords");
        db.Videos.Add(new Video("Legacy film", "Retained catalogue", 1.25m,
            "https://media.example.test/videos/41/hls/master.m3u8", "/covers/41.jpg") { Id = 41 });
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        var original = await db.Videos.AsNoTracking().OrderBy(v => v.Id).FirstAsync();
        var count = await db.Videos.CountAsync();

        await db.Database.MigrateAsync();
        Assert.Equal(9, (await db.Database.GetAppliedMigrationsAsync()).Count());
        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
        Assert.Equal(count, await db.Videos.CountAsync());
        var restored = await db.Videos.SingleAsync(v => v.Id == original.Id);
        Assert.Equal(original.VideoUrl, restored.VideoUrl);
        Assert.Equal(original.ThumbnailUrl, restored.ThumbnailUrl);
        db.VideoTranslations.Add(new VideoTranslation(restored.Id, "pl", "Zachowany film"));
        await db.SaveChangesAsync();
        Assert.Equal("Zachowany film", (await db.VideoTranslations.SingleAsync()).Title);
    }
}
