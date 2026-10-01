using Amazon.S3.Transfer;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Moq;
using NetFilmx_Service.Storage;

namespace NetFilmx_Tests.Unit.Storage;

public class R2StorageServiceTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "netfilmx-r2-test-" + Guid.NewGuid().ToString("N"));

    public R2StorageServiceTests()
    {
        Directory.CreateDirectory(_directory);
        File.WriteAllText(Path.Combine(_directory, "master.m3u8"), "#EXTM3U");
    }

    [Fact]
    public async Task Hls_RetryAllocatesAnotherPrefix_AndUsesConfiguredOrigin()
    {
        var requests = new List<TransferUtilityUploadDirectoryRequest>();
        var transfer = new Mock<ITransferUtility>(MockBehavior.Strict);
        transfer.Setup(t => t.UploadDirectoryAsync(It.IsAny<TransferUtilityUploadDirectoryRequest>(), It.IsAny<CancellationToken>()))
            .Callback<TransferUtilityUploadDirectoryRequest, CancellationToken>((request, _) => requests.Add(request))
            .Returns(Task.CompletedTask);
        var storage = new R2StorageService(transfer.Object, "test-bucket", "https://media.example.test/");

        var first = await storage.UploadHlsAsync(_directory);
        var second = await storage.UploadHlsAsync(_directory);

        requests.Should().HaveCount(2);
        requests.Select(r => r.KeyPrefix).Should().OnlyHaveUniqueItems();
        foreach (var request in requests)
        {
            request.BucketName.Should().Be("test-bucket");
            request.KeyPrefix.Should().MatchRegex("^uploads/videos/[a-f0-9]{32}/hls$");
            request.Directory.Should().Be(_directory);
        }
        first.Should().Be($"https://media.example.test/{requests[0].KeyPrefix}/master.m3u8");
        second.Should().Be($"https://media.example.test/{requests[1].KeyPrefix}/master.m3u8");
        transfer.Verify(t => t.UploadDirectoryAsync(It.IsAny<TransferUtilityUploadDirectoryRequest>(), It.IsAny<CancellationToken>()), Times.Exactly(2));
        transfer.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Upload_DoesNotReportSuccessBeforeTransferCompletes_AndPropagatesFailure()
    {
        var completion = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var transfer = new Mock<ITransferUtility>();
        transfer.Setup(t => t.UploadDirectoryAsync(It.IsAny<TransferUtilityUploadDirectoryRequest>(), It.IsAny<CancellationToken>()))
            .Returns(completion.Task);
        var storage = new R2StorageService(transfer.Object, "test-bucket", "https://media.example.test");

        var pending = storage.UploadHlsAsync(_directory);
        pending.IsCompleted.Should().BeFalse();
        completion.SetException(new IOException("Upload failed"));
        var act = () => pending;
        await act.Should().ThrowAsync<IOException>();
    }

    [Fact]
    public async Task MissingConfiguration_RefusesBothUploads()
    {
        using var storage = new R2StorageService(new ConfigurationBuilder().Build());
        storage.IsConfigured.Should().BeFalse();
        var hls = () => storage.UploadHlsAsync(_directory);
        var poster = () => storage.UploadPosterAsync("poster.jpg", "image/jpeg");
        await hls.Should().ThrowAsync<InvalidOperationException>();
        await poster.Should().ThrowAsync<InvalidOperationException>();
    }

    [Theory]
    [InlineData("image/jpeg", ".jpg")]
    [InlineData("image/png", ".png")]
    [InlineData("image/webp", ".webp")]
    public async Task Poster_AllocatesUniqueKeys_WithoutUsingSourceFilename(string contentType, string extension)
    {
        var requests = new List<TransferUtilityUploadRequest>();
        var transfer = new Mock<ITransferUtility>();
        transfer.Setup(t => t.UploadAsync(It.IsAny<TransferUtilityUploadRequest>(), It.IsAny<CancellationToken>()))
            .Callback<TransferUtilityUploadRequest, CancellationToken>((request, _) => requests.Add(request))
            .Returns(Task.CompletedTask);
        var storage = new R2StorageService(transfer.Object, "test-bucket", "https://media.example.test");

        var first = await storage.UploadPosterAsync("source-name", contentType);
        var second = await storage.UploadPosterAsync("source-name", contentType);

        requests.Should().HaveCount(2);
        requests.Select(r => r.Key).Should().OnlyHaveUniqueItems();
        requests.Should().OnlyContain(r => r.Key.StartsWith("uploads/posters/") && r.Key.EndsWith(extension));
        requests.Should().OnlyContain(r => r.ContentType == contentType && r.FilePath == "source-name");
        first.Should().Be($"https://media.example.test/{requests[0].Key}");
        second.Should().Be($"https://media.example.test/{requests[1].Key}");
    }

    [Theory]
    [InlineData("image/svg+xml")]
    [InlineData("text/html")]
    [InlineData("application/octet-stream")]
    public async Task UnsupportedPosterType_DoesNotUpload(string type)
    {
        var transfer = new Mock<ITransferUtility>(MockBehavior.Strict);
        var storage = new R2StorageService(transfer.Object, "test-bucket", "https://media.example.test");
        var act = () => storage.UploadPosterAsync("source", type);
        await act.Should().ThrowAsync<ArgumentException>();
        transfer.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task MissingPlaylist_DoesNotUpload()
    {
        var transfer = new Mock<ITransferUtility>(MockBehavior.Strict);
        var storage = new R2StorageService(transfer.Object, "test-bucket", "https://media.example.test");
        var act = () => storage.UploadHlsAsync(Path.Combine(_directory, "missing"));
        await act.Should().ThrowAsync<IOException>();
        transfer.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData("http://media.example.test")]
    [InlineData("https://secret@media.example.test")]
    [InlineData("https://media.example.test/path")]
    [InlineData("https://media.example.test/?token=secret")]
    public void InvalidPublicOrigin_IsRejected(string origin)
    {
        var act = () => new R2StorageService(Mock.Of<ITransferUtility>(), "bucket", origin);
        act.Should().Throw<ArgumentException>();
    }

    public void Dispose() => Directory.Delete(_directory, recursive: true);
}
