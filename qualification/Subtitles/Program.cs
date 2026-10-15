using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NetFilmx_Service.Processing;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;
using NetFilmx_Tests.Helpers;

if (args is ["--help"])
{
    Console.WriteLine("Local only: extract <input> <new-private-output> | fixture <new-private-output>");
    return;
}
if (args is not (["extract", _, _] or ["fixture", _]))
    throw new ArgumentException("Use --help for the local subtitle qualification tool.");
string output = Path.GetFullPath(args[^1]);
if (Directory.Exists(output)) throw new IOException("Use a new private output directory.");
if (OperatingSystem.IsWindows()) Directory.CreateDirectory(output);
else Directory.CreateDirectory(output, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
using var deadline = new CancellationTokenSource(TimeSpan.FromMinutes(3));
string input = args[0] == "fixture" ? await SubtitleFixture.CreateAsync(Path.Combine(output, "source"), adaptive: true) : Path.GetFullPath(args[1]);
string sidecars = Path.Combine(output, "mp4-subtitles");
var subtitles = await new TextSubtitleExtractor().ExtractAsync(input, sidecars, deadline.Token);
var json = new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true };
static async Task<string> Hash(string file)
{
    await using var stream = File.OpenRead(file);
    return Convert.ToHexString(await SHA256.HashDataAsync(stream)).ToLowerInvariant();
}
var evidence = new List<object>();
foreach (var track in subtitles)
{
    string file = Path.Combine(sidecars, track.FileName);
    var cues = await WebVttFile.ReadAsync(file, deadline.Token);
    evidence.Add(new { track, sha256 = await Hash(file), bytes = new FileInfo(file).Length,
        cueCount = cues.Count, firstCue = cues[0], lastCue = cues[^1] });
}
await File.WriteAllTextAsync(Path.Combine(output, "subtitle-evidence.json"), JsonSerializer.Serialize(new
{
    observedUtc = DateTimeOffset.UtcNow, inputSha256 = await Hash(input), inputBytes = new FileInfo(input).Length,
    scope = "local subtitle extraction only; no video/audio encoding for extract mode",
    providerWrites = false, productionAcceptance = false, tracks = evidence
}, json));
if (args[0] == "fixture")
{
    await File.WriteAllBytesAsync(Path.Combine(output, "poster.png"), Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII="));
    string hls = Path.Combine(output, "hls"); Directory.CreateDirectory(hls);
    var hlsTracks = await new FFmpegService().RunFFmpegHlsAsync(input, hls, deadline.Token);
    string database = Path.Combine(output, "catalogue.db");
    await using var db = new NetFilmxDbContext(new DbContextOptionsBuilder<NetFilmxDbContext>()
        .UseSqlite($"Data Source={database};Pooling=false").Options);
    await db.Database.MigrateAsync(deadline.Token);
    const string origin = "https://fixture.example.test/";
    var plain = new Video("Fixture without subtitles", "Six-second local fixture", 0, origin + "source/plain.mp4", origin + "poster.png");
    var mp4 = new Video("Fixture MP4 with subtitles", "Six-second local fixture", 0, origin + "source/plain.mp4", origin + "poster.png");
    var adaptive = new Video("Fixture HLS with subtitles", "Six-second local fixture", 0, origin + "hls/master.m3u8", origin + "poster.png");
    foreach (var track in subtitles) mp4.Subtitles.Add(new VideoSubtitle(track.TrackKey, track.Language, track.Label, origin + "mp4-subtitles/" + track.FileName, track.Position));
    foreach (var track in hlsTracks) adaptive.Subtitles.Add(new VideoSubtitle(track.TrackKey, track.Language, track.Label, origin + "hls/" + track.FileName, track.Position));
    db.AddRange(plain, mp4, adaptive); await db.SaveChangesAsync(deadline.Token);
    await File.WriteAllTextAsync(Path.Combine(output, "fixture.json"), JsonSerializer.Serialize(new
        { database, plain = plain.Id, mp4 = mp4.Id, hls = adaptive.Id, origin, scope = "synthetic local MP4/HLS + three languages; uploads/worker stay disabled" }, json));
}
Console.WriteLine($"Prepared {subtitles.Count} text subtitle tracks; provider writes and activation disabled.");
