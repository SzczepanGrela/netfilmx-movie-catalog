using System.Globalization;
using System.Text.Json;

namespace NetFilmx_Service.Processing;

public sealed record HlsVariant(string Name, int Width, int Height, int BitrateK, int MaxRateK, int BufSizeK, int AudioBitrateK);
public sealed record HlsEncodingPlan(int SourceWidth, int SourceHeight, bool HasAudio, double? HoldLastFrameUntil,
    IReadOnlyList<HlsVariant> Variants, IReadOnlyList<string> Arguments);

public class FFmpegService : IFFmpegService
{
    public const int SegmentSeconds = 6;

    public async Task<IReadOnlyList<SubtitleFile>> RunFFmpegHlsAsync(string inputPath, string outputDir, CancellationToken token)
    {
        if (!File.Exists(inputPath)) throw new FileNotFoundException("Video source is missing.");
        // Required subtitles validate before video encoding; failed jobs retain their source.
        var subtitles = await new TextSubtitleExtractor().ExtractAsync(inputPath, outputDir, token);
        var plan = await PlanAsync(inputPath, outputDir, token);
        Directory.CreateDirectory(outputDir);
        var result = await MediaProcess.RunAsync("ffmpeg", plan.Arguments, TimeSpan.FromMinutes(30), token);
        if (result.ExitCode != 0 || !File.Exists(Path.Combine(outputDir, "master.m3u8")))
            throw new IOException("Video conversion failed or produced no master playlist.");
        return subtitles;
    }

    // The offline catalogue tool and upload worker use the same plan and encoder.
    public async Task<HlsEncodingPlan> PlanAsync(string inputPath, string outputDir, CancellationToken token)
    {
        if (!File.Exists(inputPath)) throw new FileNotFoundException("Video source is missing.");
        var resolution = await MediaProcess.RunAsync("ffprobe", ["-protocol_whitelist", "file,pipe", "-v", "error",
            "-select_streams", "v:0", "-show_entries", "stream=width,height,codec_name:format=duration", "-of", "json", inputPath],
            TimeSpan.FromSeconds(15), token);
        if (resolution.ExitCode != 0) throw new IOException("Video probe failed.");
        int width, height;
        double? holdLastFrameUntil = null;
        try
        {
            using var document = JsonDocument.Parse(resolution.Output);
            var stream = document.RootElement.GetProperty("streams")[0];
            width = stream.GetProperty("width").GetInt32(); height = stream.GetProperty("height").GetInt32();
            // Theora can end in zero-byte repeat packets not emitted as decoded frames.
            // HLS EXTINF follows video, so retain that final still through the source end.
            if (stream.GetProperty("codec_name").GetString() == "theora")
            {
                string? raw = document.RootElement.GetProperty("format").GetProperty("duration").GetString();
                if (!double.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out double duration)
                    || !double.IsFinite(duration) || duration <= 0 || duration > 86400)
                    throw new IOException("Theora requires a bounded source duration to preserve its ending.");
                holdLastFrameUntil = duration;
            }
        }
        catch (Exception error) when (error is JsonException or InvalidOperationException or KeyNotFoundException or IndexOutOfRangeException)
        { throw new IOException("Invalid video probe.", error); }
        if (width < 2 || height < 2 || width > 8192 || height > 8192)
            throw new IOException("Unsupported video dimensions or failed probe.");
        var audio = await MediaProcess.RunAsync("ffprobe", ["-protocol_whitelist", "file,pipe", "-v", "error",
            "-select_streams", "a:0", "-show_entries", "stream=channels", "-of", "csv=p=0", inputPath],
            TimeSpan.FromSeconds(15), token);
        if (audio.ExitCode != 0) throw new IOException("Audio probe failed.");
        bool hasAudio = int.TryParse(audio.Output.Trim(), out int channels) && channels > 0;
        var variants = GetAdaptiveVariants(width, height);
        var args = new List<string> { "-nostdin", "-v", "error", "-threads", "2", "-filter_complex_threads", "1",
            "-protocol_whitelist", "file,pipe", "-y", "-i", inputPath };
        if (!hasAudio) args.AddRange(["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"]);
        string hold = holdLastFrameUntil.HasValue ? "tpad=stop_mode=clone:stop=-1," : "";
        string split = $"[0:v:0]{hold}split={variants.Count}" + string.Concat(Enumerable.Range(0, variants.Count).Select(i => $"[v{i}]"));
        // scale preserves input display aspect ratio through SAR, including even-pixel rounding.
        // No padding, cropping or enlarged canvas.
        string scales = string.Join(';', variants.Select((v, i) => $"[v{i}]scale={v.Width}:{v.Height}:flags=lanczos[v{i}out]"));
        args.AddRange(["-filter_complex", split + ";" + scales, "-map_metadata", "-1"]);
        if (!hasAudio) args.Add("-shortest");
        for (int i = 0; i < variants.Count; i++)
        {
            var v = variants[i];
            args.AddRange(["-map", $"[v{i}out]", $"-c:v:{i}", "libx264", $"-pix_fmt:v:{i}", "yuv420p",
                $"-threads:v:{i}", "2", $"-preset:v:{i}", "fast", $"-crf:v:{i}", "23",
                $"-b:v:{i}", $"{v.BitrateK}k", $"-maxrate:v:{i}", $"{v.MaxRateK}k", $"-bufsize:v:{i}", $"{v.BufSizeK}k",
                $"-sc_threshold:v:{i}", "0", $"-g:v:{i}", "300", $"-flags:v:{i}", "+cgop",
                $"-force_key_frames:v:{i}", $"expr:gte(t,n_forced*{SegmentSeconds})"]);
        }
        for (int i = 0; i < variants.Count; i++)
            args.AddRange(["-map", hasAudio ? "0:a:0" : "1:a:0", $"-c:a:{i}", "aac",
                $"-b:a:{i}", $"{variants[i].AudioBitrateK}k", $"-ac:a:{i}", "2", $"-ar:a:{i}", "48000"]);
        if (holdLastFrameUntil.HasValue) args.AddRange(["-t", holdLastFrameUntil.Value.ToString("R", CultureInfo.InvariantCulture)]);
        args.AddRange(["-f", "hls", "-hls_time", SegmentSeconds.ToString(CultureInfo.InvariantCulture),
            "-hls_playlist_type", "vod", "-hls_flags", "independent_segments+temp_file", "-hls_segment_type", "mpegts",
            "-hls_segment_filename", Path.Combine(outputDir, "stream_%v_data%03d.ts"), "-master_pl_name", "master.m3u8",
            "-var_stream_map", string.Join(' ', Enumerable.Range(0, variants.Count).Select(i => $"v:{i},a:{i}")),
            Path.Combine(outputDir, "stream_%v.m3u8")]);
        return new(width, height, hasAudio, holdLastFrameUntil, variants, args);
    }

    public static IReadOnlyList<HlsVariant> GetAdaptiveVariants(int sourceWidth, int sourceHeight)
    {
        if (sourceWidth < 2 || sourceHeight < 2 || sourceWidth > 8192 || sourceHeight > 8192)
            throw new ArgumentOutOfRangeException(nameof(sourceWidth));
        var variants = new List<HlsVariant>();
        // Both axes constrain every rung. Small and portrait sources cannot upscale.
        foreach (var (maxWidth, maxHeight) in new[] { (1920, 1080), (1280, 720), (854, 480), (640, 360), (426, 240), (256, 144) })
        {
            double factor = Math.Min(1, Math.Min((double)maxWidth / sourceWidth, (double)maxHeight / sourceHeight));
            int width = Math.Max(2, (int)Math.Floor(sourceWidth * factor / 2) * 2);
            int height = Math.Max(2, (int)Math.Floor(sourceHeight * factor / 2) * 2);
            // Avoid nearly identical levels when a native size is just above a standard box.
            if (variants.Count > 0 && width >= variants[^1].Width * .8 && height >= variants[^1].Height * .8) continue;
            int pixels = width * height;
            var (rate, peak, buffer) = pixels switch
            {
                > 921600 => (2400, 2600, 3500),
                > 409920 => (1400, 1550, 2000),
                > 230400 => (750, 850, 1100),
                > 102240 => (400, 450, 600),
                > 36864 => (350, 400, 500),
                _ => (160, 220, 320)
            };
            // First audio track, stereo AAC; keep audio quality stable across switches.
            variants.Add(new($"{height}p", width, height, rate, peak, buffer, 128));
            if (variants.Count == 3) break;
        }
        return variants;
    }
}
