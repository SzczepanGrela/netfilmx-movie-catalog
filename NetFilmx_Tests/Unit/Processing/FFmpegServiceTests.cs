using NetFilmx_Service.Processing;

namespace NetFilmx_Tests.Unit.Processing;

public class FFmpegServiceTests
{
    [Fact]
    public async Task SilentSyntheticVideo_ProducesFiniteHls()
    {
        string directory = Path.Combine(Path.GetTempPath(), "netfilmx-ffmpeg-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            string input = Path.Combine(directory, "source.mp4");
            string output = Path.Combine(directory, "hls");
            Directory.CreateDirectory(output);
            var generated = await MediaProcess.RunAsync("ffmpeg",
                $"-nostdin -f lavfi -i color=c=black:s=64x64:r=10 -t 0.3 -c:v libx264 -threads 1 -pix_fmt yuv420p \"{input}\"",
                TimeSpan.FromSeconds(10), CancellationToken.None);
            Assert.Equal(0, generated.ExitCode);
            using var stop = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            await new FFmpegService().RunFFmpegHlsAsync(input, output, stop.Token);
            Assert.Contains("#EXTM3U", await File.ReadAllTextAsync(Path.Combine(output, "master.m3u8")));
            Assert.NotEmpty(Directory.GetFiles(output, "*.ts"));
        }
        finally { Directory.Delete(directory, true); }
    }

    [Fact]
    public async Task MissingSource_FailsBeforeStartingAProcess() =>
        await Assert.ThrowsAsync<FileNotFoundException>(() => new FFmpegService()
            .RunFFmpegHlsAsync("non-existent.mp4", Path.GetTempPath(), CancellationToken.None));

    [Fact]
    public async Task ProcessDeadline_StopsARealLongRunningProcess()
    {
        if (OperatingSystem.IsWindows()) return;
        await Assert.ThrowsAsync<TimeoutException>(() => MediaProcess.RunAsync("/bin/sh", "-c \"sleep 30\"",
            TimeSpan.FromMilliseconds(100), CancellationToken.None));
    }

    [Fact]
    public async Task Cancellation_IsDistinctFromDeadline()
    {
        if (OperatingSystem.IsWindows()) return;
        using var stop = new CancellationTokenSource(TimeSpan.FromMilliseconds(100));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => MediaProcess.RunAsync("/bin/sh", "-c \"sleep 30\"",
            TimeSpan.FromMinutes(1), stop.Token));
    }
}
