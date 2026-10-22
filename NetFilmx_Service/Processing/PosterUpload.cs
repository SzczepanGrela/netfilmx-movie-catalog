using System.Text.Json;

namespace NetFilmx_Service.Processing;

public static class PosterUpload
{
    public const long MaximumBytes = 5 * 1024 * 1024;

    public sealed class PreparedPoster : IDisposable
    {
        private readonly string _directory;
        public string Path { get; }
        public string ContentType => "image/jpeg";
        internal PreparedPoster(string directory, string path) { _directory = directory; Path = path; }
        public void Dispose() => Directory.Delete(_directory, recursive: true);
    }

    public static async Task<PreparedPoster> PrepareAsync(Stream source, string contentType, CancellationToken token)
    {
        var extension = contentType switch
        {
            "image/jpeg" => "jpg", "image/png" => "png", "image/webp" => "webp",
            _ => throw new InvalidDataException("Poster must be JPEG, PNG or WebP.")
        };
        var directory = Path.Combine(Path.GetTempPath(), "netfilmx-poster-" + Guid.NewGuid().ToString("N"));
        if (OperatingSystem.IsWindows()) Directory.CreateDirectory(directory);
        else Directory.CreateDirectory(directory, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        try
        {
            var input = Path.Combine(directory, "source." + extension);
            var output = Path.Combine(directory, "poster.jpg");
            var options = new FileStreamOptions { Mode = FileMode.CreateNew, Access = FileAccess.Write, Share = FileShare.None };
            if (!OperatingSystem.IsWindows()) options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
            long total = 0;
            await using (var file = new FileStream(input, options))
            {
                var buffer = new byte[64 * 1024];
                int read;
                while ((read = await source.ReadAsync(buffer, token)) > 0)
                {
                    total += read;
                    if (total > MaximumBytes) throw new InvalidDataException("Poster exceeds 5 MiB.");
                    await file.WriteAsync(buffer.AsMemory(0, read), token);
                }
            }
            if (total < 12) throw new InvalidDataException("Poster is empty or incomplete.");
            var header = new byte[12];
            await using (var file = File.OpenRead(input)) await file.ReadExactlyAsync(header, token);
            var signature = extension switch
            {
                "jpg" => header[0] == 0xff && header[1] == 0xd8 && header[2] == 0xff,
                "png" => header.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }),
                "webp" => header.AsSpan(0, 4).SequenceEqual("RIFF"u8) && header.AsSpan(8, 4).SequenceEqual("WEBP"u8),
                _ => false
            };
            if (!signature) throw new InvalidDataException("Poster content does not match its declared type.");
            var probe = await MediaProcess.RunAsync("ffprobe",
                $"-v error -max_alloc 67108864 -protocol_whitelist file,pipe -f image2 -i \"{input}\" -select_streams v:0 -show_entries stream=codec_name,width,height -of json",
                TimeSpan.FromSeconds(10), token);
            using var document = JsonDocument.Parse(probe.Output);
            var streams = document.RootElement.GetProperty("streams");
            if (probe.ExitCode != 0 || streams.GetArrayLength() != 1) throw new InvalidDataException("Poster cannot be decoded.");
            var stream = streams[0];
            var width = stream.GetProperty("width").GetInt32();
            var height = stream.GetProperty("height").GetInt32();
            var expectedCodec = extension switch { "jpg" => "mjpeg", "png" => "png", _ => "webp" };
            if (stream.GetProperty("codec_name").GetString() != expectedCodec || width is < 1 or > 4096 || height is < 1 or > 4096
                || (long)width * height > 16_000_000) throw new InvalidDataException("Poster dimensions or codec are invalid.");
            var converted = await MediaProcess.RunAsync("ffmpeg",
                $"-nostdin -v error -xerror -max_alloc 67108864 -threads 1 -protocol_whitelist file,pipe -f image2 -i \"{input}\" -map 0:v:0 -frames:v 1 -map_metadata -1 -c:v mjpeg -threads 1 -q:v 3 -update 1 \"{output}\"",
                TimeSpan.FromSeconds(10), token);
            if (converted.ExitCode != 0 || !File.Exists(output) || new FileInfo(output).Length is < 1 or > MaximumBytes)
                throw new InvalidDataException("Poster conversion failed.");
            if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(output, UnixFileMode.UserRead | UnixFileMode.UserWrite);
            return new PreparedPoster(directory, output);
        }
        catch (Exception exception)
        {
            Directory.Delete(directory, recursive: true);
            if (exception is JsonException or KeyNotFoundException or InvalidOperationException or TimeoutException)
                throw new InvalidDataException("Poster cannot be decoded within the configured limits.", exception);
            throw;
        }
    }

    // Admission check only; the bounded worker still probes and decodes the full video.
    public static async Task ValidateVideoHeaderAsync(Stream source, string filename, CancellationToken token)
    {
        var header = new byte[12];
        try { await source.ReadExactlyAsync(header, token); }
        catch (EndOfStreamException exception) { throw new InvalidDataException("Video is incomplete.", exception); }
        var valid = Path.GetExtension(filename).ToLowerInvariant() switch
        {
            ".mp4" or ".mov" => header.AsSpan(4, 4).SequenceEqual("ftyp"u8),
            ".mkv" or ".webm" => header.AsSpan(0, 4).SequenceEqual(new byte[] { 0x1a, 0x45, 0xdf, 0xa3 }),
            ".ogv" or ".ogg" => header.AsSpan(0, 4).SequenceEqual("OggS"u8),
            ".avi" => header.AsSpan(0, 4).SequenceEqual("RIFF"u8) && header.AsSpan(8, 4).SequenceEqual("AVI "u8),
            _ => false
        };
        if (!valid) throw new InvalidDataException("Video content does not match a supported container.");
    }
}
