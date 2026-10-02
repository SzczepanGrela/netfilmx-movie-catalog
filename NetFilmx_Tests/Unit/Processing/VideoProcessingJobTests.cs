using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using NetFilmx_Service.Processing;
using NetFilmx_Service.Storage;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;
using NetFilmx_Web.Services;
using Hangfire;
using Hangfire.Common;
using Hangfire.States;

namespace NetFilmx_Tests.Unit.Processing;

public sealed class VideoProcessingJobTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "netfilmx-worker-test-" + Guid.NewGuid().ToString("N"));
    private readonly UploadStagingStore _staging;
    private readonly Mock<ICloudStorageService> _storage = new();
    private readonly Mock<IFFmpegService> _ffmpeg = new();
    private const string PublishedUrl = "https://media.example.test/uploads/unique/master.m3u8";

    public VideoProcessingJobTests()
    {
        Directory.CreateDirectory(_root);
        if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(_root, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        _staging = new UploadStagingStore(true, _root);
        using var db = OpenDb();
        db.Database.EnsureCreated();
        _storage.Setup(s => s.IsConfigured).Returns(true);
        _storage.Setup(s => s.UploadHlsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(PublishedUrl);
        _ffmpeg.Setup(f => f.RunFFmpegHlsAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
    }

    private NetFilmxDbContext OpenDb() => new(new DbContextOptionsBuilder<NetFilmxDbContext>()
        .UseSqlite($"Data Source={Path.Combine(_root, "catalogue.sqlite3")};Pooling=False").Options);
    private VideoProcessingJob Worker(NetFilmxDbContext db) => new(Mock.Of<ILogger<VideoProcessingJob>>(),
        _storage.Object, db, _ffmpeg.Object, _staging);
    private async Task<(int Id, string Upload)> AddUpload()
    {
        using var source = new MemoryStream(new byte[] {1,2,3});
        string upload = await _staging.StageAsync(source, CancellationToken.None);
        await using var db = OpenDb();
        var video = new Video("Test", "Description", 1, "PROCESSING", "/poster.jpg") { SourceUploadId = upload };
        db.Videos.Add(video);
        await db.SaveChangesAsync();
        return (video.Id, upload);
    }

    [Fact]
    public async Task DuplicateDelivery_AfterNewContext_DoesNotConvertOrUploadTwice()
    {
        var item = await AddUpload();
        await using (var db = OpenDb()) await Worker(db).ProcessVideoAsync(item.Id, item.Upload, CancellationToken.None);
        File.Exists(_staging.InputPath(item.Upload)).Should().BeFalse();
        await using (var db = OpenDb()) await Worker(db).ProcessVideoAsync(item.Id, item.Upload, CancellationToken.None);
        await using var check = OpenDb();
        (await check.Videos.SingleAsync()).VideoUrl.Should().Be(PublishedUrl);
        _storage.Verify(s => s.UploadHlsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        _ffmpeg.Verify(f => f.RunFFmpegHlsAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task FailedTransfer_RetainsSource_AndNewWorkerCanRetry()
    {
        var item = await AddUpload();
        _storage.SetupSequence(s => s.UploadHlsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new IOException("Transfer failed")).ReturnsAsync(PublishedUrl);
        await using (var db = OpenDb())
            await Assert.ThrowsAsync<IOException>(() => Worker(db).ProcessVideoAsync(item.Id, item.Upload, CancellationToken.None));
        File.Exists(_staging.InputPath(item.Upload)).Should().BeTrue();
        await using (var db = OpenDb()) (await db.Videos.SingleAsync()).VideoUrl.Should().Be("FAILED");
        await using (var db = OpenDb()) await Worker(db).ProcessVideoAsync(item.Id, item.Upload, CancellationToken.None);
        File.Exists(_staging.InputPath(item.Upload)).Should().BeFalse();
    }

    [Fact]
    public async Task ShutdownCancellation_RetainsSourceAndIntent()
    {
        var item = await AddUpload();
        using var cancellation = new CancellationTokenSource();
        _ffmpeg.Setup(f => f.RunFFmpegHlsAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns<string,string,CancellationToken>((_, _, token) => { cancellation.Cancel(); return Task.FromCanceled(token); });
        await using var db = OpenDb();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => Worker(db).ProcessVideoAsync(item.Id, item.Upload, cancellation.Token));
        (await db.Videos.SingleAsync()).VideoUrl.Should().Be("PROCESSING");
        File.Exists(_staging.InputPath(item.Upload)).Should().BeTrue();
        _storage.Verify(s => s.UploadHlsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task FailedConversion_IsRetryable_AndRetainsSource()
    {
        var item = await AddUpload();
        _ffmpeg.Setup(f => f.RunFFmpegHlsAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new IOException("Conversion failed"));
        await using var db = OpenDb();
        await Assert.ThrowsAsync<IOException>(() => Worker(db).ProcessVideoAsync(item.Id, item.Upload, CancellationToken.None));
        (await db.Videos.SingleAsync()).VideoUrl.Should().Be("FAILED");
        File.Exists(_staging.InputPath(item.Upload)).Should().BeTrue();
        _storage.Verify(s => s.UploadHlsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task MissingConfiguration_DoesNotStartConversionOrDeleteSource()
    {
        var item = await AddUpload();
        _storage.Setup(s => s.IsConfigured).Returns(false);
        await using var db = OpenDb();
        await Assert.ThrowsAsync<InvalidOperationException>(() => Worker(db).ProcessVideoAsync(item.Id, item.Upload, CancellationToken.None));
        File.Exists(_staging.InputPath(item.Upload)).Should().BeTrue();
        _ffmpeg.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ConcurrentAdminEdit_IsNotOverwrittenByWorker()
    {
        var item = await AddUpload();
        _storage.Setup(s => s.UploadHlsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(async () =>
        {
            await using var editor = OpenDb();
            var video = await editor.Videos.SingleAsync();
            video.VideoUrl = "https://media.example.test/admin-edit.mp4";
            await editor.SaveChangesAsync();
            return PublishedUrl;
        });
        await using (var db = OpenDb()) await Worker(db).ProcessVideoAsync(item.Id, item.Upload, CancellationToken.None);
        await using var check = OpenDb();
        (await check.Videos.SingleAsync()).VideoUrl.Should().EndWith("admin-edit.mp4");
    }

    [Fact]
    public async Task InterruptedDispatch_RetainsIntent_ForAnotherProcess()
    {
        var item = await AddUpload();
        var unavailable = new Mock<IBackgroundJobClient>();
        unavailable.Setup(c => c.Create(It.IsAny<Job>(), It.IsAny<IState>())).Throws(new IOException("Queue unavailable"));
        await using (var db = OpenDb())
            await Assert.ThrowsAsync<IOException>(() => UploadDispatcher.DispatchAsync(db, unavailable.Object, CancellationToken.None));
        var queue = new Mock<IBackgroundJobClient>();
        queue.Setup(c => c.Create(It.IsAny<Job>(), It.IsAny<IState>())).Returns("job-1");
        await using (var db = OpenDb()) await UploadDispatcher.DispatchAsync(db, queue.Object, CancellationToken.None);
        await using (var db = OpenDb()) await UploadDispatcher.DispatchAsync(db, queue.Object, CancellationToken.None);
        queue.Verify(c => c.Create(It.Is<Job>(j => j.Type == typeof(VideoJobRunner) && (int)j.Args[0] == item.Id
            && (string)j.Args[1] == item.Upload), It.IsAny<IState>()), Times.Once);
    }

    public void Dispose() => Directory.Delete(_root, true);
}
