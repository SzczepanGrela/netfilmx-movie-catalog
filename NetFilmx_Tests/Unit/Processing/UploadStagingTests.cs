using NetFilmx_Service.Processing;

namespace NetFilmx_Tests.Unit.Processing;

public sealed class UploadStagingTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "netfilmx-staging-test-" + Guid.NewGuid().ToString("N"));
    public UploadStagingTests()
    {
        Directory.CreateDirectory(_root);
        if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(_root, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
    }

    [Fact]
    public async Task WorkerLock_IsVisibleToAnotherOperatingSystemProcess()
    {
        if (!OperatingSystem.IsLinux()) return;
        var store = new UploadStagingStore(true, _root);
        async Task<int> TryLock()
        {
            using var process = new System.Diagnostics.Process
            {
                StartInfo = new System.Diagnostics.ProcessStartInfo("flock")
                { UseShellExecute = false, ArgumentList = { "--nonblock", Path.Combine(_root, ".worker.lock"), "true" } }
            };
            process.Start();
            await process.WaitForExitAsync();
            return process.ExitCode;
        }
        using (await store.AcquireWorkerLockAsync(CancellationToken.None)) Assert.Equal(1, await TryLock());
        Assert.Equal(0, await TryLock());
    }

    [Fact]
    public async Task Stage_SurvivesANewStoreInstance_AndUsesPrivateMode()
    {
        var first = new UploadStagingStore(true, _root);
        using var input = new MemoryStream(new byte[] { 1, 2, 3 });
        string id = await first.StageAsync(input, CancellationToken.None);
        var second = new UploadStagingStore(true, _root);
        Assert.Equal(new byte[] {1,2,3}, await File.ReadAllBytesAsync(second.InputPath(id)));
        Assert.Empty(Directory.GetFiles(_root, "*.partial", SearchOption.AllDirectories));
        if (!OperatingSystem.IsWindows())
            Assert.Equal(UnixFileMode.UserRead | UnixFileMode.UserWrite, File.GetUnixFileMode(second.InputPath(id)));
    }

    [Theory]
    [InlineData("../escape")]
    [InlineData("/tmp/source")]
    [InlineData("123")]
    public void JobArguments_CannotChooseArbitraryPaths(string id) =>
        Assert.Throws<ArgumentException>(() => new UploadStagingStore(true, _root).InputPath(id));

    [Fact]
    public async Task EmptyUpload_DoesNotLeaveAnIncompleteSource()
    {
        using var input = new MemoryStream();
        await Assert.ThrowsAsync<IOException>(() => new UploadStagingStore(true, _root).StageAsync(input, CancellationToken.None));
        Assert.Empty(Directory.EnumerateFileSystemEntries(_root));
    }

    [Fact]
    public async Task CancelledStaging_DoesNotPublishPartialInput()
    {
        using var input = new MemoryStream(new byte[] { 1, 2, 3 });
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            new UploadStagingStore(true, _root).StageAsync(input, cancellation.Token));
        Assert.Empty(Directory.EnumerateFileSystemEntries(_root));
    }

    [Fact]
    public async Task SharedMountLock_ExcludesAnotherInstance_AndReleasesOnDispose()
    {
        var first = new UploadStagingStore(true, _root);
        var second = new UploadStagingStore(true, _root);
        using (await first.AcquireWorkerLockAsync(CancellationToken.None))
        {
            using var stop = new CancellationTokenSource(TimeSpan.FromMilliseconds(100));
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => second.AcquireWorkerLockAsync(stop.Token));
        }
        using var acquired = await second.AcquireWorkerLockAsync(CancellationToken.None);
    }

    public void Dispose() => Directory.Delete(_root, true);
}
