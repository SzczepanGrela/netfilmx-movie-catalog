using System.Diagnostics;
using System.Text;
using NetFilmx_Service.Processing;

namespace NetFilmx_Tests.Unit.Processing;

public class PosterUploadTests
{
    private static async Task<string> Image(string extension, string codec, string size = "32x24")
    {
        var directory = Path.Combine(Path.GetTempPath(), "netfilmx-poster-fixture-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory, "input." + extension);
        using var process = Process.Start(new ProcessStartInfo("ffmpeg",
            $"-nostdin -v error -f lavfi -i color=c=red:s={size} -frames:v 1 -c:v {codec} -threads 1 -update 1 \"{path}\"")
            { UseShellExecute = false })!;
        await process.WaitForExitAsync(); Assert.Equal(0, process.ExitCode);
        return path;
    }

    [Theory]
    [InlineData("png", "png", "image/png")]
    [InlineData("jpg", "mjpeg", "image/jpeg")]
    [InlineData("webp", "libwebp", "image/webp")]
    public async Task Raster_IsDecodedAndReencodedAsPrivateJpeg(string extension, string codec, string mime)
    {
        var input = await Image(extension, codec);
        try
        {
            if (extension == "jpg") await File.AppendAllTextAsync(input, "UNTRUSTED_TRAILING_METADATA");
            string path;
            await using (var source = File.OpenRead(input))
            using (var poster = await PosterUpload.PrepareAsync(source, mime, CancellationToken.None))
            {
                path = poster.Path;
                var bytes = await File.ReadAllBytesAsync(path);
                Assert.Equal((byte)0xff, bytes[0]); Assert.Equal((byte)0xd8, bytes[1]);
                Assert.Equal("image/jpeg", poster.ContentType);
                Assert.DoesNotContain("UNTRUSTED_TRAILING_METADATA", Encoding.UTF8.GetString(bytes));
                if (!OperatingSystem.IsWindows())
                {
                    Assert.Equal(UnixFileMode.UserRead | UnixFileMode.UserWrite, File.GetUnixFileMode(path));
                    Assert.Equal(UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute, File.GetUnixFileMode(Path.GetDirectoryName(path)!));
                }
            }
            Assert.False(File.Exists(path));
        }
        finally { Directory.Delete(Path.GetDirectoryName(input)!, recursive: true); }
    }

    [Theory]
    [InlineData("<html>not an image</html>", "image/jpeg")]
    [InlineData("<svg xmlns='http://www.w3.org/2000/svg'></svg>", "image/png")]
    public async Task ClaimedMime_DoesNotPermitHtmlOrSvg(string text, string mime)
    {
        using var source = new MemoryStream(Encoding.UTF8.GetBytes(text));
        await Assert.ThrowsAsync<InvalidDataException>(() => PosterUpload.PrepareAsync(source, mime, CancellationToken.None));
    }

    [Fact]
    public async Task ValidSignatureWithoutImage_IsRejectedByDecoder()
    {
        using var source = new MemoryStream(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0 });
        await Assert.ThrowsAsync<InvalidDataException>(() => PosterUpload.PrepareAsync(source, "image/png", CancellationToken.None));
    }

    [Fact]
    public async Task ActualBytesBeyondMaximum_AreRejected()
    {
        using var source = new MemoryStream(new byte[PosterUpload.MaximumBytes + 1]);
        await Assert.ThrowsAsync<InvalidDataException>(() => PosterUpload.PrepareAsync(source, "image/png", CancellationToken.None));
    }

    [Fact]
    public async Task ExcessiveDimensions_AreRejected()
    {
        var input = await Image("png", "png", "4098x2");
        try
        {
            await using var source = File.OpenRead(input);
            await Assert.ThrowsAsync<InvalidDataException>(() => PosterUpload.PrepareAsync(source, "image/png", CancellationToken.None));
        }
        finally { Directory.Delete(Path.GetDirectoryName(input)!, recursive: true); }
    }

    [Theory]
    [InlineData("fake.mp4")]
    [InlineData("playlist.m3u8")]
    [InlineData("fake.svg")]
    public async Task VideoAdmission_RejectsHtmlAndPlaylists(string filename)
    {
        using var source = new MemoryStream(Encoding.UTF8.GetBytes("<html>or #EXTM3U reference</html>"));
        await Assert.ThrowsAsync<InvalidDataException>(() => PosterUpload.ValidateVideoHeaderAsync(source, filename, CancellationToken.None));
    }
}
