using NetFilmx_Service.Processing;
using System.Globalization;
using System.Text.Json;

namespace NetFilmx_Tests.Unit.Processing;

public class FFmpegServiceTests
{
    [Fact]
    public async Task TheoraFinalStill_ContinuesThroughOriginalContainerEnding()
    {
        string directory = Path.Combine(Path.GetTempPath(), "netfilmx-theora-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            string input = Path.Combine(directory, "source.ogv"), output = Path.Combine(directory, "hls");
            var generated = await MediaProcess.RunAsync("ffmpeg", ["-v", "error", "-nostdin", "-f", "lavfi", "-i",
                "testsrc2=s=160x90:r=12:d=2", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=3.3",
                "-c:v", "libtheora", "-threads", "1", "-c:a", "libvorbis", input], TimeSpan.FromSeconds(10), CancellationToken.None);
            Assert.Equal(0, generated.ExitCode);
            var service = new FFmpegService();
            using var stop = new CancellationTokenSource(TimeSpan.FromSeconds(20));
            var plan = await service.PlanAsync(input, output, stop.Token);
            Assert.InRange(plan.HoldLastFrameUntil!.Value, 3.29, 3.31);
            await service.RunFFmpegHlsAsync(input, output, stop.Token);
            var lines = await File.ReadAllLinesAsync(Path.Combine(output, "stream_0.m3u8"), stop.Token);
            double total = lines.Where(l => l.StartsWith("#EXTINF:")).Sum(l => double.Parse(l[8..].TrimEnd(','), CultureInfo.InvariantCulture));
            Assert.InRange(total, 3.2, 3.4);
            var video = await MediaProcess.RunAsync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries",
                "stream=duration", "-of", "json", Path.Combine(output, "stream_0_data000.ts")], TimeSpan.FromSeconds(5), stop.Token);
            using var probe = JsonDocument.Parse(video.Output);
            double duration = double.Parse(probe.RootElement.GetProperty("streams")[0].GetProperty("duration").GetString()!, CultureInfo.InvariantCulture);
            Assert.InRange(duration, 3.2, 3.4);
        }
        finally { Directory.Delete(directory, true); }
    }

    [Theory]
    [InlineData(1920, 818, 3)]
    [InlineData(862, 360, 3)]
    [InlineData(3840, 1608, 3)]
    [InlineData(426, 240, 2)]
    [InlineData(1920, 1080, 3)]
    [InlineData(240, 640, 3)]
    [InlineData(64, 64, 1)]
    public void Ladder_UsesBothSourceAxesAndDistinctUsefulSizes(int width, int height, int count)
    {
        var variants = FFmpegService.GetAdaptiveVariants(width, height);
        Assert.Equal(count, variants.Count);
        Assert.Equal(count, variants.Select(v => (v.Width, v.Height)).Distinct().Count());
        foreach (var v in variants)
        {
            Assert.InRange(v.Width, 2, Math.Min(width, 1920));
            Assert.InRange(v.Height, 2, Math.Min(height, 1080));
            Assert.Equal(0, v.Width % 2);
            Assert.Equal(0, v.Height % 2);
            Assert.Equal(128, v.AudioBitrateK);
        }
        if (width <= 1920 && height <= 1080)
            Assert.Equal((width / 2 * 2, height / 2 * 2), (variants[0].Width, variants[0].Height));
    }

    [Fact]
    public async Task WideSource_ProducesAlignedIndependentSegmentsWithoutUpscalingOrAspectLoss()
    {
        string directory = Path.Combine(Path.GetTempPath(), "netfilmx-wide-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            string input = Path.Combine(directory, "source with 'quotes'.mp4");
            var generated = await MediaProcess.RunAsync("ffmpeg", ["-v", "error", "-nostdin", "-f", "lavfi", "-i",
                "testsrc2=s=862x360:r=12:d=13", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=13",
                "-c:v", "libx264", "-threads", "1", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", input],
                TimeSpan.FromSeconds(20), CancellationToken.None);
            Assert.Equal(0, generated.ExitCode);
            string output = Path.Combine(directory, "hls");
            using var stop = new CancellationTokenSource(TimeSpan.FromSeconds(60));
            var service = new FFmpegService();
            var plan = await service.PlanAsync(input, output, stop.Token);
            Assert.Equal((862, 360), (plan.Variants[0].Width, plan.Variants[0].Height));
            await service.RunFFmpegHlsAsync(input, output, stop.Token);
            for (int i = 0; i < plan.Variants.Count; i++)
            {
                var lines = await File.ReadAllLinesAsync(Path.Combine(output, $"stream_{i}.m3u8"), stop.Token);
                Assert.Contains("#EXT-X-ENDLIST", lines);
                Assert.Contains("#EXT-X-INDEPENDENT-SEGMENTS", lines);
                var durations = lines.Where(l => l.StartsWith("#EXTINF:")).Select(l => double.Parse(l[8..].TrimEnd(','), CultureInfo.InvariantCulture)).ToArray();
                Assert.Equal(3, durations.Length);
                Assert.InRange(durations[0], 5.999, 6.001);
                Assert.InRange(durations[1], 5.999, 6.001);
                foreach (var segment in lines.Where(l => !l.StartsWith('#') && !string.IsNullOrWhiteSpace(l)))
                {
                    var probe = await MediaProcess.RunAsync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_packets",
                        "-show_entries", "packet=flags", "-read_intervals", "%+#1", "-of", "csv=p=0", Path.Combine(output, segment)],
                        TimeSpan.FromSeconds(5), stop.Token);
                    Assert.Equal(0, probe.ExitCode);
                    Assert.StartsWith("K", probe.Output.Trim());
                }
                var dimensions = await MediaProcess.RunAsync("ffprobe", ["-v", "error", "-select_streams", "v:0",
                    "-show_entries", "stream=width,height,display_aspect_ratio", "-of", "json", Path.Combine(output, $"stream_{i}_data000.ts")],
                    TimeSpan.FromSeconds(5), stop.Token);
                using var json = JsonDocument.Parse(dimensions.Output);
                var stream = json.RootElement.GetProperty("streams")[0];
                Assert.Equal(plan.Variants[i].Width, stream.GetProperty("width").GetInt32());
                Assert.Equal(plan.Variants[i].Height, stream.GetProperty("height").GetInt32());
                var dar = stream.GetProperty("display_aspect_ratio").GetString()!.Split(':').Select(s => double.Parse(s, CultureInfo.InvariantCulture)).ToArray();
                Assert.InRange(Math.Abs(dar[0] / dar[1] - 862d / 360), 0, .001);
            }
        }
        finally { Directory.Delete(directory, true); }
    }

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
