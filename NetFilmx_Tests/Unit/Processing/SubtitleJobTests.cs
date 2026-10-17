using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using NetFilmx_Service.Processing;
using NetFilmx_Service.Storage;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;
using NetFilmx_Tests.Helpers;

namespace NetFilmx_Tests.Unit.Processing;

public sealed class SubtitleJobTests : IDisposable
{
    private readonly string root = Path.Combine(Path.GetTempPath(), "netfilmx-subtitle-job-" + Guid.NewGuid().ToString("N"));
    private UploadStagingStore Staging()
    {
        string path = Path.Combine(root, "staging");
        Directory.CreateDirectory(path);
        if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        return new(true, path);
    }
    private NetFilmxDbContext Db() => new(new DbContextOptionsBuilder<NetFilmxDbContext>()
        .UseSqlite($"Data Source={Path.Combine(root,"test.db")};Pooling=false").Options);
    private VideoProcessingJob Job(NetFilmxDbContext db, ICloudStorageService storage, IFFmpegService? processor=null) =>
        new(NullLogger<VideoProcessingJob>.Instance, storage, db, processor ?? new FFmpegService(), Staging());
    private async Task<(int Id,string Upload)> Stage(string source)
    {
        await using var file = File.OpenRead(source);
        string upload = await Staging().StageAsync(file, CancellationToken.None);
        await using var db = Db(); await db.Database.EnsureCreatedAsync();
        var video = new Video("Synthetic", "Six seconds", 0, "PROCESSING", "https://media.example.test/cover.png") {SourceUploadId=upload};
        db.Videos.Add(video); await db.SaveChangesAsync();
        return (video.Id,upload);
    }
    private static Mock<ICloudStorageService> Storage()
    {
        var mock=new Mock<ICloudStorageService>(); mock.Setup(s=>s.IsConfigured).Returns(true);
        mock.Setup(s=>s.UploadHlsAsync(It.IsAny<string>(),It.IsAny<CancellationToken>()))
            .ReturnsAsync("https://media.example.test/uploads/test/hls/master.m3u8");
        return mock;
    }

    [Fact]
    public async Task ActualInputWithoutCaptions_BecomesReadyWithoutSubtitleRows()
    {
        await SubtitleFixture.CreateAsync(Path.Combine(root,"source"));
        var item=await Stage(Path.Combine(root,"source/plain.mp4"));var storage=Storage();
        await using(var db=Db()) await Job(db,storage.Object).ProcessVideoAsync(item.Id,item.Upload,CancellationToken.None);
        await using(var db=Db())
        {
            Assert.EndsWith("master.m3u8",(await db.Videos.SingleAsync()).VideoUrl);
            Assert.Equal(item.Upload,(await db.Videos.SingleAsync()).ProcessedUploadId);
            Assert.Empty(await db.VideoSubtitles.ToArrayAsync());
        }
    }

    [Fact]
    public async Task FailedSubtitleTransfer_RetryAndDuplicateAcrossContexts_PreserveAllRelations()
    {
        var item=await Stage(await SubtitleFixture.CreateAsync(Path.Combine(root,"source")));
        var storage=Storage();
        storage.SetupSequence(s=>s.UploadHlsAsync(It.IsAny<string>(),It.IsAny<CancellationToken>()))
            .ThrowsAsync(new IOException("Synthetic sidecar transfer failure"))
            .ReturnsAsync("https://media.example.test/uploads/retry/hls/master.m3u8");
        await using(var db=Db()) await Assert.ThrowsAsync<IOException>(()=>Job(db,storage.Object).ProcessVideoAsync(item.Id,item.Upload,CancellationToken.None));
        Assert.True(File.Exists(Staging().InputPath(item.Upload)));
        await using(var db=Db()) {Assert.Equal("FAILED",(await db.Videos.SingleAsync()).VideoUrl);Assert.Empty(await db.VideoSubtitles.ToArrayAsync());}
        await using(var db=Db()) await Job(db,storage.Object).ProcessVideoAsync(item.Id,item.Upload,CancellationToken.None);
        await using(var db=Db()) await Job(db,storage.Object).ProcessVideoAsync(item.Id,item.Upload,CancellationToken.None);
        await using(var db=Db())
        {
            var saved=await db.Videos.Include(v=>v.Subtitles).SingleAsync();
            Assert.Equal(3,saved.Subtitles.Count); Assert.Equal(item.Upload,saved.ProcessedUploadId); Assert.Null(saved.ProcessingError);
            Assert.All(saved.Subtitles,t=>Assert.StartsWith("https://media.example.test/uploads/retry/hls/subtitle-",t.Url));
            Assert.Equal(new[]{"en","pl","ru"},saved.Subtitles.Select(t=>t.Language).Order());
        }
        storage.Verify(s=>s.UploadHlsAsync(It.IsAny<string>(),It.IsAny<CancellationToken>()),Times.Exactly(2));
        Assert.False(File.Exists(Staging().InputPath(item.Upload)));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ActualUnsupportedOrDamagedSubtitles_FailWithReasonAndRetainSource(bool corrupt)
    {
        string source=await SubtitleFixture.CreateAsync(Path.Combine(root,"source"));
        source=corrupt?await SubtitleFixture.CorruptAsync(source):await SubtitleFixture.UnsupportedAsync(source);
        var item=await Stage(source);var storage=Storage();var original=await File.ReadAllBytesAsync(Staging().InputPath(item.Upload));
        await using(var db=Db()) await Assert.ThrowsAsync<SubtitleProcessingException>(()=>Job(db,storage.Object).ProcessVideoAsync(item.Id,item.Upload,CancellationToken.None));
        await using(var db=Db())
        {
            var saved=await db.Videos.SingleAsync();Assert.Equal("FAILED",saved.VideoUrl);Assert.Contains("Original source retained",saved.ProcessingError);
            Assert.Null(saved.ProcessedUploadId);Assert.Empty(await db.VideoSubtitles.ToArrayAsync());
        }
        Assert.Equal(original,await File.ReadAllBytesAsync(Staging().InputPath(item.Upload)));
        storage.Verify(s=>s.UploadHlsAsync(It.IsAny<string>(),It.IsAny<CancellationToken>()),Times.Never);
    }

    [Fact]
    public async Task CancellationAfterConversion_DoesNotCommitCaptionsOrRemoveSource()
    {
        var item=await Stage(await SubtitleFixture.CreateAsync(Path.Combine(root,"source")));var storage=Storage();
        using var stop=new CancellationTokenSource();
        storage.Setup(s=>s.UploadHlsAsync(It.IsAny<string>(),It.IsAny<CancellationToken>())).Returns<string,CancellationToken>((_,token)=>
            {stop.Cancel();return Task.FromCanceled<string>(token);});
        await using(var db=Db()) await Assert.ThrowsAnyAsync<OperationCanceledException>(()=>Job(db,storage.Object).ProcessVideoAsync(item.Id,item.Upload,stop.Token));
        await using(var db=Db()) {Assert.Equal("PROCESSING",(await db.Videos.SingleAsync()).VideoUrl);Assert.Empty(await db.VideoSubtitles.ToArrayAsync());}
        Assert.True(File.Exists(Staging().InputPath(item.Upload)));
    }

    [Fact]
    public async Task DatabaseFailure_RollsBackReadyMarkerAndEverySubtitleBeforeRetry()
    {
        var item=await Stage(await SubtitleFixture.CreateAsync(Path.Combine(root,"source")));var storage=Storage();
        await using(var db=Db())
        {
            await db.Database.ExecuteSqlRawAsync("CREATE TRIGGER refuse_test_caption BEFORE INSERT ON VideoSubtitles WHEN NEW.Language='en' BEGIN SELECT RAISE(ABORT,'synthetic failure'); END;");
            await Assert.ThrowsAsync<DbUpdateException>(()=>Job(db,storage.Object).ProcessVideoAsync(item.Id,item.Upload,CancellationToken.None));
        }
        await using(var db=Db())
        {
            var saved=await db.Videos.SingleAsync();Assert.Equal("FAILED",saved.VideoUrl);Assert.Null(saved.ProcessedUploadId);
            Assert.Empty(await db.VideoSubtitles.ToArrayAsync());
            await db.Database.ExecuteSqlRawAsync("DROP TRIGGER refuse_test_caption;");
        }
        Assert.True(File.Exists(Staging().InputPath(item.Upload)));
        await using(var db=Db()) await Job(db,storage.Object).ProcessVideoAsync(item.Id,item.Upload,CancellationToken.None);
        await using(var db=Db()) Assert.Equal(3,await db.VideoSubtitles.CountAsync());
    }

    [Fact]
    public async Task AdminReplacementAndDuplicateDelivery_DoNotRemoveUncompletedSource()
    {
        var item=await Stage(await SubtitleFixture.CreateAsync(Path.Combine(root,"source")));var storage=Storage();
        storage.Setup(s=>s.UploadHlsAsync(It.IsAny<string>(),It.IsAny<CancellationToken>())).Returns(async()=>
        {
            await using var editor=Db();var video=await editor.Videos.SingleAsync();video.VideoUrl="https://media.example.test/replacement.mp4";
            await editor.SaveChangesAsync();return "https://media.example.test/uploads/test/hls/master.m3u8";
        });
        await using(var db=Db()) await Job(db,storage.Object).ProcessVideoAsync(item.Id,item.Upload,CancellationToken.None);
        await using(var db=Db()) await Job(db,storage.Object).ProcessVideoAsync(item.Id,item.Upload,CancellationToken.None);
        Assert.True(File.Exists(Staging().InputPath(item.Upload)));
        await using(var db=Db()) {Assert.Null((await db.Videos.SingleAsync()).ProcessedUploadId);Assert.Empty(await db.VideoSubtitles.ToArrayAsync());}
        storage.Verify(s=>s.UploadHlsAsync(It.IsAny<string>(),It.IsAny<CancellationToken>()),Times.Once);
    }

    public void Dispose(){if(Directory.Exists(root))Directory.Delete(root,true);}
}
