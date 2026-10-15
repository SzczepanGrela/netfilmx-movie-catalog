using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using NetFilmx_Storage.Entities;

namespace NetFilmx_Service.Processing;

public sealed record SubtitleFile(string TrackKey, string Language, string Label, string FileName, int Position);

public sealed class SubtitleProcessingException(string message) : IOException(message);

public sealed class TextSubtitleExtractor
{
    private static readonly HashSet<string> Supported = ["subrip", "webvtt", "ass", "ssa", "mov_text", "text"];
    private sealed record Stream(int Index, string Codec, string Language, string Label, int Packets);

    public async Task<IReadOnlyList<SubtitleFile>> ExtractAsync(string input, string output, CancellationToken token)
    {
        if (!File.Exists(input)) throw new FileNotFoundException("Subtitle source is missing.");
        var probe = await MediaProcess.RunAsync("ffprobe", ["-v", "error", "-protocol_whitelist", "file,pipe",
            "-select_streams", "s", "-count_packets", "-show_entries",
            "stream=index,codec_name,nb_read_packets:stream_tags=language,title", "-of", "json", input],
            TimeSpan.FromSeconds(30), token);
        if (probe.ExitCode != 0)
            throw new SubtitleProcessingException("Subtitle probe failed. Original source retained; review before retrying.");
        var streams = ReadProbe(probe.Output);
        if (probe.HasErrorOutput)
            throw new SubtitleProcessingException("Subtitle probe reported damaged data. Original source retained; review before retrying.");
        if (streams.Count == 0) return Array.Empty<SubtitleFile>();
        // mov_text includes empty display-clear packets. Count decoded subtitle
        // frames rather than treating every packet as a visible cue.
        var decoded = await MediaProcess.RunAsync("ffprobe", ["-v", "error", "-protocol_whitelist", "file,pipe",
            "-select_streams", "s", "-count_frames", "-show_entries", "stream=index,nb_read_frames", "-of", "json", input],
            TimeSpan.FromSeconds(30), token);
        if (decoded.ExitCode != 0 || decoded.HasErrorOutput)
            throw new SubtitleProcessingException("Subtitle decoding failed. Original source retained; review before retrying.");
        var counts = ReadDecodedCounts(decoded.Output);
        Directory.CreateDirectory(output);
        var args = new List<string> { "-v", "error", "-xerror", "-err_detect", "explode", "-nostdin",
            "-threads", "1", "-protocol_whitelist", "file,pipe", "-n", "-i", input };
        var files = new List<SubtitleFile>();
        foreach (var stream in streams)
        {
            string file = $"subtitle-{stream.Index}.vtt";
            args.AddRange(["-map", $"0:{stream.Index}", "-c:s", "webvtt", "-map_metadata", "-1", "-fs", (WebVttFile.MaxBytes + 1).ToString(CultureInfo.InvariantCulture), "-f", "webvtt", Path.Combine(output, file)]);
            files.Add(new($"stream-{stream.Index}", stream.Language, stream.Label, file, files.Count));
        }
        var conversion = await MediaProcess.RunAsync("ffmpeg", args, TimeSpan.FromMinutes(2), token);
        if (conversion.ExitCode != 0 || conversion.HasErrorOutput)
            throw new SubtitleProcessingException("Text subtitle conversion failed. Original source retained; review before retrying.");
        for (int i = 0; i < files.Count; i++)
        {
            var cues = await WebVttFile.ReadAsync(Path.Combine(output, files[i].FileName), token);
            if (!counts.TryGetValue(streams[i].Index, out int expected) || cues.Count != expected)
                throw new SubtitleProcessingException("Subtitle cue count changed during conversion. Original source retained; review before retrying.");
        }
        return files;
    }

    private static Dictionary<int,int> ReadDecodedCounts(string json)
    {
        try
        {
            using var document = JsonDocument.Parse(json);
            var counts = new Dictionary<int,int>();
            foreach (var stream in document.RootElement.GetProperty("streams").EnumerateArray())
            {
                int index = stream.GetProperty("index").GetInt32();
                if (!stream.TryGetProperty("nb_read_frames", out var frames) ||
                    !int.TryParse(frames.GetString(), out int count) || count <= 0 || !counts.TryAdd(index,count))
                    throw new SubtitleProcessingException("No valid decoded subtitle cues. Original source retained for review.");
            }
            return counts;
        }
        catch (Exception error) when (error is JsonException or InvalidOperationException or KeyNotFoundException or FormatException)
        {
            throw new SubtitleProcessingException("Invalid subtitle decode probe. Original source retained for review.");
        }
    }

    private static List<Stream> ReadProbe(string json)
    {
        try
        {
            using var document = JsonDocument.Parse(json);
            var streams = document.RootElement.GetProperty("streams");
            if (streams.GetArrayLength() > 32) throw new SubtitleProcessingException("More than 32 subtitle tracks. Original source retained for administrator review.");
            var result = new List<Stream>();
            var indices = new HashSet<int>();
            foreach (var stream in streams.EnumerateArray())
            {
                int index = stream.GetProperty("index").GetInt32();
                string codec = stream.TryGetProperty("codec_name", out var value) ? value.GetString() ?? "unknown" : "unknown";
                if (!Supported.Contains(codec))
                    throw new SubtitleProcessingException($"Unsupported subtitle track {index} ({(codec.Length <= 60 && Regex.IsMatch(codec, @"\A[a-z0-9_]+\z") ? codec : "unknown")}). Supported text formats: SRT, WebVTT, ASS/SSA, mov_text and text. Image subtitles require administrator review; no OCR. Original source retained.");
                int packets = stream.TryGetProperty("nb_read_packets", out value) && int.TryParse(value.GetString(), out var count) ? count : 0;
                if (index < 0 || !indices.Add(index) || packets <= 0)
                    throw new SubtitleProcessingException("Empty or invalid subtitle track. Original source retained; review before retrying.");
                var tags = stream.TryGetProperty("tags", out value) ? value : default;
                string language = Language(tags.ValueKind == JsonValueKind.Object && tags.TryGetProperty("language", out value) ? value.GetString() : null);
                string? title = tags.ValueKind == JsonValueKind.Object && tags.TryGetProperty("title", out value) ? value.GetString() : null;
                string label = string.IsNullOrWhiteSpace(title) ? language == "und" ? $"Unknown language (stream {index})" : Label(language) : title;
                if (!VideoSubtitle.ValidMetadata($"stream-{index}", language, label, result.Count))
                    throw new SubtitleProcessingException("Invalid subtitle language or label. Original source retained for administrator review.");
                result.Add(new(index, codec, language, label, packets));
            }
            return result;
        }
        catch (Exception error) when (error is JsonException or InvalidOperationException or KeyNotFoundException or FormatException)
        {
            throw new SubtitleProcessingException("Invalid subtitle probe. Original source retained for administrator review.");
        }
    }

    internal static string Language(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "und";
        string value = raw.Trim().Replace('_', '-').ToLowerInvariant();
        value = value switch { "ger" => "de", "fre" => "fr", "dut" => "nl", "chi" => "zh", "cze" => "cs", "gre" => "el", "rum" => "ro", "per" => "fa", "slo" => "sk", _ => value };
        if (value.Length == 3)
            value = CultureInfo.GetCultures(CultureTypes.NeutralCultures)
                .FirstOrDefault(c => c.ThreeLetterISOLanguageName.Equals(value, StringComparison.OrdinalIgnoreCase))?.TwoLetterISOLanguageName ?? value;
        return Regex.IsMatch(value, "^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$") && value.Length <= 35 ? value : "und";
    }

    private static string Label(string language)
    {
        if (language == "und") return "Unknown language";
        try
        {
            string name = CultureInfo.GetCultureInfo(language).NativeName;
            return name.Length > 0 ? char.ToUpper(name[0], CultureInfo.GetCultureInfo(language)) + name[1..] : language;
        }
        catch (CultureNotFoundException) { return language; }
    }
}

public sealed record WebVttCue(double Start, double End, string Text);

public static class WebVttFile
{
    public const int MaxBytes = 8 * 1024 * 1024;
    private static readonly Regex Timing = new(@"^(?:(\d{2,}):)?([0-5]\d):([0-5]\d)\.(\d{3}) --> (?:(\d{2,}):)?([0-5]\d):([0-5]\d)\.(\d{3})(?: .*)?$", RegexOptions.CultureInvariant);

    public static async Task<IReadOnlyList<WebVttCue>> ReadAsync(string path, CancellationToken token)
    {
        var info = new FileInfo(path);
        if (!info.Exists || info.Length is <= 0 or > MaxBytes)
            throw new SubtitleProcessingException("Missing or oversized WebVTT track. Original source retained for review.");
        string text;
        try { text = new UTF8Encoding(false, true).GetString(await File.ReadAllBytesAsync(path, token)); }
        catch (DecoderFallbackException) { throw new SubtitleProcessingException("Invalid UTF-8 subtitles. Original source retained for review."); }
        text = text.TrimStart('\uFEFF').Replace("\r\n", "\n");
        if (!text.StartsWith("WEBVTT\n", StringComparison.Ordinal) || text.Contains('\uFFFD') || text.Contains('\0'))
            throw new SubtitleProcessingException("Invalid WebVTT text. Original source retained for review.");
        var cues = new List<WebVttCue>();
        foreach (var block in Regex.Split(text, @"\n[\t ]*\n"))
        {
            var lines = block.Trim('\n').Split('\n');
            int timing = Array.FindIndex(lines, line => line.Contains("-->"));
            if (timing < 0)
            {
                if (string.IsNullOrWhiteSpace(block) || block.StartsWith("WEBVTT") || block.StartsWith("NOTE")) continue;
                throw new SubtitleProcessingException("Unrecognized WebVTT block. Original source retained for review.");
            }
            var match = Timing.Match(lines[timing]);
            if (!match.Success || timing > 1)
                throw new SubtitleProcessingException("Invalid subtitle timestamp. Original source retained for review.");
            double Seconds(int at) => (match.Groups[at].Success ? double.Parse(match.Groups[at].Value, CultureInfo.InvariantCulture) * 3600 : 0) +
                double.Parse(match.Groups[at + 1].Value, CultureInfo.InvariantCulture) * 60 +
                double.Parse(match.Groups[at + 2].Value, CultureInfo.InvariantCulture) +
                double.Parse(match.Groups[at + 3].Value, CultureInfo.InvariantCulture) / 1000;
            double start = Seconds(1), end = Seconds(5);
            string cue = string.Join('\n', lines.Skip(timing + 1));
            if (!double.IsFinite(start) || !double.IsFinite(end) || end <= start || string.IsNullOrWhiteSpace(cue) || (cues.Count > 0 && start < cues[^1].Start))
                throw new SubtitleProcessingException("Invalid subtitle cue timing or text. Original source retained for review.");
            cues.Add(new(start, end, cue));
        }
        if (cues.Count == 0) throw new SubtitleProcessingException("Empty WebVTT track. Original source retained for review.");
        return cues;
    }
}
