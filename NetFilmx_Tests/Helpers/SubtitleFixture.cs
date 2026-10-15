using System.Diagnostics;
using System.Globalization;
using System.Text;
using System.Text.Json;

namespace NetFilmx_Tests.Helpers;

public static class SubtitleFixture
{
    public const string Polish = "Zażółć gęślą jaźń";
    public const string Russian = "Привет, мир";

    public static async Task<string> CreateAsync(string root, bool adaptive = false)
    {
        Directory.CreateDirectory(root);
        string Srt(string first, string second) => $"1\n00:00:00,500 --> 00:00:02,000\n{first}\n\n2\n00:00:03,000 --> 00:00:05,500\n{second}\n";
        await File.WriteAllTextAsync(Path.Combine(root, "pl.srt"), Srt(Polish, "Później — druga plansza"), new UTF8Encoding(false));
        await File.WriteAllTextAsync(Path.Combine(root, "en.srt"), Srt("English first cue", "English after seeking"), new UTF8Encoding(false));
        await File.WriteAllTextAsync(Path.Combine(root, "ru.srt"), Srt(Russian, "После перемотки"), new UTF8Encoding(false));
        string source = Path.Combine(root, "source.mkv");
        await RunAsync(["-v", "error", "-nostdin", "-n", "-f", "lavfi", "-i", adaptive ? "color=c=black:s=1280x720:r=24:d=6" : "color=c=black:s=128x72:r=24:d=6",
            "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=6",
            "-i", Path.Combine(root, "pl.srt"), "-i", Path.Combine(root, "en.srt"), "-i", Path.Combine(root, "ru.srt"),
            "-map", "0:v", "-map", "1:a", "-map", "2:s", "-map", "3:s", "-map", "4:s",
            "-c:v", "libx264", "-threads", "1", "-pix_fmt", "yuv420p", "-c:a", "aac", "-c:s", "subrip",
            "-metadata:s:s:0", "language=pol", "-metadata:s:s:0", "title=Polski",
            "-metadata:s:s:1", "language=eng", "-metadata:s:s:1", "title=English",
            "-metadata:s:s:2", "language=rus", "-metadata:s:s:2", "title=Русский", source]);
        await RunAsync(["-v", "error", "-nostdin", "-n", "-i", source, "-map", "0:v:0", "-map", "0:a:0",
            "-c", "copy", "-movflags", "+faststart", Path.Combine(root, "plain.mp4")]);
        return source;
    }

    // The real Matroska demuxer/probe sees a declared PGS stream. Its payload is
    // a controlled placeholder; the application must reject the codec before OCR/encoding.
    public static async Task<string> UnsupportedAsync(string source)
    {
        byte[] bytes = await File.ReadAllBytesAsync(source);
        Replace(bytes, Encoding.UTF8.GetBytes("S_TEXT/UTF8"), Encoding.UTF8.GetBytes("S_HDMV/PGS\0"));
        string path = Path.Combine(Path.GetDirectoryName(source)!, "unsupported.mkv");
        await File.WriteAllBytesAsync(path, bytes);
        return path;
    }

    public static async Task<string> CorruptAsync(string source)
    {
        byte[] bytes = await File.ReadAllBytesAsync(source);
        byte[] original = Encoding.UTF8.GetBytes(Polish), replacement = original.ToArray();
        replacement[0] = 0xff;
        Replace(bytes, original, replacement);
        string path = Path.Combine(Path.GetDirectoryName(source)!, "corrupt.mkv");
        await File.WriteAllBytesAsync(path, bytes);
        return path;
    }

    public static async Task<string> MovTextAsync(string source)
    {
        string output=Path.Combine(Path.GetDirectoryName(source)!,"mov-text.mp4");
        await RunAsync(["-v","error","-nostdin","-n","-i",source,"-map","0","-c:v","copy","-c:a","copy","-c:s","mov_text",output]);
        return output;
    }

    public static async Task<Dictionary<int, (double Start, double End)[]>> MovTextCueTimesAsync(string source)
    {
        string json = await RunAsync(["-v", "error", "-select_streams", "s", "-show_packets",
            "-show_entries", "packet=stream_index,pts_time,duration_time,size", "-of", "json", source], "ffprobe");
        using var document = JsonDocument.Parse(json);
        // mov_text packets with only a two-byte length clear the display.
        return document.RootElement.GetProperty("packets").EnumerateArray()
            .Where(p => int.Parse(p.GetProperty("size").GetString()!, CultureInfo.InvariantCulture) > 2)
            .GroupBy(p => p.GetProperty("stream_index").GetInt32())
            .ToDictionary(g => g.Key, g => g.Select(p =>
            {
                double start = double.Parse(p.GetProperty("pts_time").GetString()!, CultureInfo.InvariantCulture);
                double duration = double.Parse(p.GetProperty("duration_time").GetString()!, CultureInfo.InvariantCulture);
                return (start, start + duration);
            }).ToArray());
    }

    private static void Replace(byte[] source, byte[] before, byte[] after)
    {
        if (before.Length != after.Length) throw new InvalidOperationException("Fixture replacement length differs.");
        int at = source.AsSpan().IndexOf(before);
        if (at < 0) throw new InvalidOperationException("Fixture marker not found.");
        after.CopyTo(source, at);
    }

    private static async Task<string> RunAsync(string[] arguments, string executable = "ffmpeg")
    {
        var start = new ProcessStartInfo(executable) { RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false };
        foreach (string argument in arguments) start.ArgumentList.Add(argument);
        using var process = Process.Start(start)!;
        var output = process.StandardOutput.ReadToEndAsync();
        var error = process.StandardError.ReadToEndAsync();
        using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        try { await process.WaitForExitAsync(deadline.Token); }
        catch { if (!process.HasExited) process.Kill(true); await process.WaitForExitAsync(); throw; }
        string stdout = await output;
        if (process.ExitCode != 0) throw new IOException("Synthetic fixture generation failed: " + await error);
        await error;
        return stdout;
    }
}
