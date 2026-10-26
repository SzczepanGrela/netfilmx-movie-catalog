using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NetFilmx_Service.Dtos.Video;
using NetFilmx_Service.Mappings;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;
using NetFilmx_Storage.Repositories;
using NetFilmx_Tests.Integration.Fixtures;
using System.Text.RegularExpressions;

namespace NetFilmx_Tests.Integration;

public sealed class SubtitlePersistenceTests
{
    [Fact]
    public async Task SubtitleLinksDtoSurviveRestart_AndWatchRequiresPlaybackGrant()
    {
        string root=Path.Combine(Path.GetTempPath(),"netfilmx-subtitle-restart-"+Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);string dbPath=Path.Combine(root,"catalogue.db"),keys=Path.Combine(root,"keys");
        if(OperatingSystem.IsWindows())Directory.CreateDirectory(keys);
        else Directory.CreateDirectory(keys,UnixFileMode.UserRead|UnixFileMode.UserWrite|UnixFileMode.UserExecute);
        int captioned,plain;
        try
        {
            using(var factory=new TestWebApplicationFactory<Program>(dbPath,keys))
            {
                using var scope=factory.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<NetFilmxDbContext>();
                var withTracks=new Video("Captioned","Fixture",0,"https://media.example.test/video.mp4","https://media.example.test/poster.png");
                withTracks.Subtitles.Add(new VideoSubtitle("stream-2","pl","Polski & źródło","https://media.example.test/subtitles/pl.vtt",0));
                withTracks.Subtitles.Add(new VideoSubtitle("stream-3","ru","Русский","https://media.example.test/subtitles/ru.vtt",1));
                var without=new Video("Plain","Fixture",0,"https://media.example.test/plain.mp4","https://media.example.test/poster.png");
                db.AddRange(withTracks,without);await db.SaveChangesAsync();captioned=withTracks.Id;plain=without.Id;
                Assert.False(db.Database.HasPendingModelChanges());
                using var client=factory.CreateClient(new(){BaseAddress=new Uri("https://localhost")});
                var html=await client.GetStringAsync("/Home/Watch/"+captioned);
                Assert.DoesNotContain("<track id=\"subtitle-",html);
                Assert.Contains("data-video-id=\""+captioned+"\"",html);
                Assert.DoesNotContain("https://media.example.test/subtitles/",html);
                Assert.Contains("/lib/vidstack/player.js",html);
                Assert.DoesNotContain("cdn.vidstack.io",html);
                Assert.DoesNotContain("<track id=\"subtitle-",await client.GetStringAsync("/Home/Watch/"+plain));
            }
            using(var factory=new TestWebApplicationFactory<Program>(dbPath,keys))
            {
                using var scope=factory.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<NetFilmxDbContext>();
                var repository=new VideoRepository(db);var loaded=await repository.GetVideoByIdAsync(captioned);
                var dto=new CatalogueMapper().Map<VideoCardDto>(loaded);
                Assert.Equal(new[]{"pl","ru"},dto.Subtitles.Select(t=>t.Language));
                Assert.Equal("Polski & źródło",dto.Subtitles[0].Label);
                using var client=factory.CreateClient(new(){BaseAddress=new Uri("https://localhost")});
                Assert.DoesNotContain("<track id=\"subtitle-",await client.GetStringAsync("/Home/Watch/"+captioned));
                db.VideoSubtitles.Add(new VideoSubtitle("stream-2","en","Duplicate","https://media.example.test/subtitles/duplicate.vtt",0){VideoId=captioned});
                await Assert.ThrowsAsync<DbUpdateException>(()=>db.SaveChangesAsync());
                db.ChangeTracker.Clear();db.Videos.Remove(await db.Videos.SingleAsync(v=>v.Id==captioned));await db.SaveChangesAsync();
                Assert.Empty(await db.VideoSubtitles.Where(s=>s.VideoId==captioned).ToArrayAsync());
            }
        }
        finally{Directory.Delete(root,true);}
    }
}
