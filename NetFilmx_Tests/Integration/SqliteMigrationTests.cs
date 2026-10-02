using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;

namespace NetFilmx_Tests.Integration;

public sealed class SqliteMigrationTests
{
    [Fact]
    public async Task Sqlite_LoadsNativeLibraryWithTheCve20256965Fix()
    {
        await using var db = new NetFilmxDbContext(new DbContextOptionsBuilder<NetFilmxDbContext>()
            .UseNetFilmxDatabase("Data Source=:memory:").Options);
        await db.Database.OpenConnectionAsync();
        await using var command = db.Database.GetDbConnection().CreateCommand();
        command.CommandText = "SELECT sqlite_version()";
        var version = Version.Parse((string)(await command.ExecuteScalarAsync())!);

        // Check the library actually loaded by EF, rather than the NuGet label.
        Assert.True(version >= new Version(3, 50, 2), $"Unpatched native SQLite: {version}");
    }

    [Theory]
    [InlineData("20260728210152_InitialSqlite")]
    [InlineData("20260807090211_ArgonPasswords")]
    public async Task LegacySqlite_UpgradePreservesCatalogue_AndAddsTranslations(string sourceMigration)
    {
        await using var db = new NetFilmxDbContext(new DbContextOptionsBuilder<NetFilmxDbContext>()
            .UseNetFilmxDatabase("Data Source=:memory:").Options);
        await db.Database.OpenConnectionAsync();
        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync(sourceMigration);

        // Seed the historical columns directly: the current EF model contains
        // properties that did not exist in the original production schema.
        // Deliberately use gaps in IDs and both remote and relative media paths.
        var createdAt = new DateTime(2026, 7, 29, 12, 30, 0, DateTimeKind.Unspecified);
        var media = new[]
        {
            (Id: 1, Url: "https://media.example.test/retained/first.mp4", Cover: "/covers/first.jpg"),
            (Id: 3, Url: "/hls/3/master.m3u8", Cover: "https://media.example.test/third.jpg"),
            (Id: 41, Url: "https://media.example.test/videos/41/hls/master.m3u8", Cover: "/covers/41.jpg")
        };
        foreach (var item in media)
        {
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "Videos"
                ("Id", "Title", "Description", "Price", "VideoUrl", "ThumbnailUrl", "Views", "CreatedAt", "UpdatedAt")
                VALUES ({item.Id}, {"Legacy film"}, {"Retained catalogue"}, {1.25m},
                        {item.Url}, {item.Cover}, {17}, {createdAt}, {createdAt})
                """);
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "Series" ("Id", "Name", "Price", "Description", "CreatedAt", "UpdatedAt")
                VALUES ({item.Id}, {"Legacy series"}, {2.50m}, {"Retained series"}, {createdAt}, {createdAt})
                """);
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "Categories" ("Id", "Name", "Description")
                VALUES ({item.Id}, {"Animation"}, {"Retained category"})
                """);
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "Tags" ("Id", "Name") VALUES ({item.Id}, {"Short"})
                """);
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "VideoCategory" ("CategoryId", "VideoId") VALUES ({item.Id}, {item.Id})
                """);
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "VideoSeries" ("SeriesId", "VideoId") VALUES ({item.Id}, {item.Id})
                """);
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "VideoTag" ("TagId", "VideoId") VALUES ({item.Id}, {item.Id})
                """);
        }

        await db.Database.MigrateAsync();
        Assert.Equal(10, (await db.Database.GetAppliedMigrationsAsync()).Count());
        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
        Assert.Equal(3, await db.Videos.CountAsync());
        Assert.Equal(3, await db.Series.CountAsync());
        Assert.Equal(3, await db.Categories.CountAsync());
        Assert.Equal(3, await db.Tags.CountAsync());
        Assert.False(await db.Bundles.AnyAsync());
        Assert.False(await db.Users.AnyAsync());
        foreach (var item in media)
        {
            var restored = await db.Videos.Include(v => v.Categories).Include(v => v.Series)
                .Include(v => v.Tags).SingleAsync(v => v.Id == item.Id);
            Assert.Equal(item.Url, restored.VideoUrl);
            Assert.Equal(item.Cover, restored.ThumbnailUrl);
            Assert.Equal(1.25m, restored.Price);
            Assert.Equal(17, restored.Views);
            Assert.Equal(createdAt, restored.CreatedAt);
            Assert.Equal(createdAt, restored.UpdatedAt);
            Assert.Equal(item.Id, Assert.Single(restored.Categories).Id);
            Assert.Equal(item.Id, Assert.Single(restored.Series).Id);
            Assert.Equal(item.Id, Assert.Single(restored.Tags).Id);
        }
        db.VideoTranslations.Add(new VideoTranslation(41, "pl", "Zachowany film"));
        var next = new Video("New film", "New catalogue entry", 0, "/new.mp4", "/new.jpg");
        db.Videos.Add(next);
        await db.SaveChangesAsync();
        Assert.Equal("Zachowany film", (await db.VideoTranslations.SingleAsync()).Title);
        Assert.True(next.Id > 41);
    }
}
