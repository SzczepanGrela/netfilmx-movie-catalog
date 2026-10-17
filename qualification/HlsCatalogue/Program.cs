using System.Diagnostics;
using System.Security.Cryptography;
using System.Text.Json;
using NetFilmx_Service.Processing;

if (args is ["--help"])
{
    Console.WriteLine("Offline only: encode <original-file> <new-private-output-directory>, or plan <original-file> <hls-directory> (read-only JSON). Uses the upload FFmpegService, no providers or database.");
    return;
}
if (args is ["plan", _, _])
{
    var proposed = await new FFmpegService().PlanAsync(Path.GetFullPath(args[1]), Path.GetFullPath(args[2]), CancellationToken.None);
    Console.WriteLine(JsonSerializer.Serialize(proposed, new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true }));
    return;
}
if (args is not ["encode", _, _]) throw new ArgumentException("Use --help.");
string input = Path.GetFullPath(args[1]), output = Path.GetFullPath(args[2]);
if (!File.Exists(input) || Directory.Exists(output)) throw new IOException("Source must exist; output must be new.");
if (OperatingSystem.IsWindows()) Directory.CreateDirectory(output);
else Directory.CreateDirectory(output, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
using var deadline = new CancellationTokenSource(TimeSpan.FromMinutes(31));
Console.CancelKeyPress += (_, e) => { e.Cancel = true; deadline.Cancel(); };
string hls = Path.Combine(output, "hls");
var encoder = new FFmpegService();
var plan = await encoder.PlanAsync(input, hls, deadline.Token);
var json = new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true };
static async Task<string> Hash(string file)
{
    await using var stream = File.OpenRead(file);
    return Convert.ToHexString(await SHA256.HashDataAsync(stream)).ToLowerInvariant();
}
var sourceHash = await Hash(input);
string assembly = typeof(FFmpegService).Assembly.Location;
await File.WriteAllTextAsync(Path.Combine(output, "encoding-plan.json"), JsonSerializer.Serialize(new
{
    createdUtc = DateTimeOffset.UtcNow, input, inputSha256 = sourceHash, inputBytes = new FileInfo(input).Length,
    encoderAssemblySha256 = await Hash(assembly), plan, providerWrites = false,
    audioLimitation = "first audio stream only, AAC stereo 128 kb/s 48 kHz; no offsets or multi-audio",
    sharedEncoder = "NetFilmx_Service.Processing.FFmpegService"
}, json));
var watch = Stopwatch.StartNew();
var tracks = await encoder.RunFFmpegHlsAsync(input, hls, deadline.Token);
var objects = new List<object>();
foreach (var file in Directory.GetFiles(hls).Order())
    objects.Add(new { file = Path.GetFileName(file), bytes = new FileInfo(file).Length, sha256 = await Hash(file) });
foreach (var track in tracks) await WebVttFile.ReadAsync(Path.Combine(hls, track.FileName), deadline.Token);
if (await Hash(input) != sourceHash) throw new IOException("Source changed during encoding.");
await File.WriteAllTextAsync(Path.Combine(output, "encoded.json"), JsonSerializer.Serialize(new
{
    completedUtc = DateTimeOffset.UtcNow, elapsedSeconds = watch.Elapsed.TotalSeconds,
    inputSha256 = sourceHash, inputBytes = new FileInfo(input).Length,
    encoderAssemblySha256 = await Hash(assembly), plan, tracks, objects,
    sourcePreserved = true, providerWrites = false, manifestActivated = false,
    scope = "Local encoding completed; separate playlist/segment/browser verification and publication decision required"
}, json));
Console.WriteLine(JsonSerializer.Serialize(new { output, variants = plan.Variants, tracks = tracks.Count, files = objects.Count, seconds = watch.Elapsed.TotalSeconds }));
