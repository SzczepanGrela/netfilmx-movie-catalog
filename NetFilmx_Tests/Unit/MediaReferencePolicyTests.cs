using Microsoft.Extensions.Configuration;
using NetFilmx_Web.Security;

namespace NetFilmx_Tests.Unit;

public class MediaReferencePolicyTests
{
    private static MediaReferencePolicy Policy() => new(new ConfigurationBuilder().AddInMemoryCollection(
        new Dictionary<string, string?> { ["CloudflareR2:PublicUrl"] = "https://media.example.test" }).Build());

    [Theory]
    [InlineData("https://www.youtube.com/watch?v=old")]
    [InlineData("https://media.example.test.evil.test/film.mp4")]
    [InlineData("https://media.example.test@evil.test/film.mp4")]
    [InlineData("https://user@media.example.test/film.mp4")]
    [InlineData("http://media.example.test/film.mp4")]
    [InlineData("https://media.example.test:8443/film.mp4")]
    [InlineData("javascript:alert(1)")]
    [InlineData("https://media.example.test/film.mp4?secret=value")]
    public void OtherOriginsAndUnsafeReferences_AreRejected(string url) => Assert.False(Policy().Allows(url));

    [Fact]
    public void ExactMediaOrigin_AcceptsRetainedAndNewObjectPaths()
    {
        Assert.True(Policy().Allows("https://media.example.test/retained/film.mp4"));
        Assert.True(Policy().Allows("https://media.example.test/uploads/videos/random/master.m3u8"));
    }

    [Fact]
    public void MissingOrigin_RejectsReferences() => Assert.False(new MediaReferencePolicy(new ConfigurationBuilder().Build()).Allows("https://media.example.test/film.mp4"));
}
