using NetFilmx_Service.Processing;
using NetFilmx_Tests.Helpers;

namespace NetFilmx_Tests.Unit.Processing;

public sealed class TextSubtitleExtractorTests : IDisposable
{
    private readonly string root = Path.Combine(Path.GetTempPath(), "netfilmx-subtitles-" + Guid.NewGuid().ToString("N"));

    [Fact]
    public async Task ActualMkv_ProducesAllLanguagesUtf8AndOriginalCueTimes()
    {
        string input = await SubtitleFixture.CreateAsync(root);
        string output = Path.Combine(root, "vtt");
        var tracks = await new TextSubtitleExtractor().ExtractAsync(input, output, CancellationToken.None);
        Assert.Equal(new[] { "pl", "en", "ru" }, tracks.Select(t => t.Language));
        Assert.Equal(new[] { "Polski", "English", "Русский" }, tracks.Select(t => t.Label));
        foreach (var track in tracks)
        {
            var cues = await WebVttFile.ReadAsync(Path.Combine(output, track.FileName), CancellationToken.None);
            Assert.Equal(2, cues.Count);
            // Matroska's AAC priming yields a common 21ms input timeline shift.
            Assert.InRange(cues[0].Start, .5, .522);
            Assert.InRange(cues[0].End, 2, 2.022);
            Assert.InRange(cues[1].Start, 3, 3.022);
            Assert.InRange(cues[1].End, 5.5, 5.522);
        }
        Assert.Contains(SubtitleFixture.Polish, await File.ReadAllTextAsync(Path.Combine(output, tracks[0].FileName)));
        Assert.Contains(SubtitleFixture.Russian, await File.ReadAllTextAsync(Path.Combine(output, tracks[2].FileName)));
        Assert.True(File.Exists(input));
    }

    [Fact]
    public async Task Mp4MovTextClearPacketsDoNotLoseOrInventVisibleCues()
    {
        string source=await SubtitleFixture.CreateAsync(root),input=await SubtitleFixture.MovTextAsync(source),output=Path.Combine(root,"mov-vtt");
        var tracks=await new TextSubtitleExtractor().ExtractAsync(input,output,CancellationToken.None);
        Assert.Equal(new[]{"pl","en","ru"},tracks.Select(t=>t.Language));
        foreach(var track in tracks)
        {
            var cues=await WebVttFile.ReadAsync(Path.Combine(output,track.FileName),CancellationToken.None);
            Assert.Equal(2,cues.Count);Assert.Equal(.5,cues[0].Start);Assert.Equal(2,cues[0].End);
        }
        Assert.Contains(SubtitleFixture.Polish,await File.ReadAllTextAsync(Path.Combine(output,tracks[0].FileName)));
    }

    [Fact]
    public async Task ActualMp4WithoutSubtitles_ReturnsNoTracks()
    {
        await SubtitleFixture.CreateAsync(root);
        Assert.Empty(await new TextSubtitleExtractor().ExtractAsync(Path.Combine(root, "plain.mp4"), Path.Combine(root, "empty"), CancellationToken.None));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task UnsupportedOrCorruptEmbeddedTrack_FailsAndRetainsOriginal(bool corrupt)
    {
        string source = await SubtitleFixture.CreateAsync(root);
        string input = corrupt ? await SubtitleFixture.CorruptAsync(source) : await SubtitleFixture.UnsupportedAsync(source);
        var before = await File.ReadAllBytesAsync(input);
        var error = await Assert.ThrowsAsync<SubtitleProcessingException>(() => new TextSubtitleExtractor()
            .ExtractAsync(input, Path.Combine(root, "failed"), CancellationToken.None));
        if (!corrupt) Assert.Contains("Unsupported subtitle", error.Message);
        Assert.Equal(before, await File.ReadAllBytesAsync(input));
    }

    [Fact]
    public async Task RealHlsConversion_ReturnsAllTextTracksAlongsideFiniteH264Aac()
    {
        string input = await SubtitleFixture.CreateAsync(root), output = Path.Combine(root, "hls");
        Directory.CreateDirectory(output);
        var tracks = await new FFmpegService().RunFFmpegHlsAsync(input, output, CancellationToken.None);
        Assert.Equal(3, tracks.Count);
        Assert.Contains("#EXTM3U", await File.ReadAllTextAsync(Path.Combine(output, "master.m3u8")));
        Assert.All(tracks, track => Assert.True(File.Exists(Path.Combine(output, track.FileName))));
        Assert.NotEmpty(Directory.GetFiles(output, "*.ts"));
    }

    [Theory]
    [InlineData("ger", "de")]
    [InlineData("fre", "fr")]
    [InlineData("dut", "nl")]
    [InlineData("eng", "en")]
    [InlineData("vie", "vi")]
    [InlineData(null, "und")]
    public void LanguageMetadata_NormalizesLegacyCodes(string? code, string expected) =>
        Assert.Equal(expected, TextSubtitleExtractor.Language(code));

    [Theory]
    [InlineData("WEBVTT\n\n00:02.000 --> 00:01.000\nwrong timing\n")]
    [InlineData("WEBVTT\n\n")]
    [InlineData("WEBVTT\n\n00:00.500 --> 00:01.000\n\uFFFD\n")]
    public async Task InvalidEmptyOrDamagedVttCannotBecomeARequiredTrack(string text)
    {
        Directory.CreateDirectory(root);
        string path = Path.Combine(root, "invalid.vtt");
        await File.WriteAllTextAsync(path, text);
        await Assert.ThrowsAsync<SubtitleProcessingException>(() => WebVttFile.ReadAsync(path, CancellationToken.None));
    }

    public void Dispose() { if (Directory.Exists(root)) Directory.Delete(root, true); }
}
