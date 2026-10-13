using System.Text.RegularExpressions;
using NetFilmx_Tests.Integration.Fixtures;

namespace NetFilmx_Tests.Integration;

public class MediaCreditsTests
{
    [Fact]
    public async Task AnonymousCreditsPageRendersAllNoticesAndRetainedEditionLicences()
    {
        using var factory = new TestWebApplicationFactory<Program>();
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        var response = await client.GetAsync("/Home/Credits");
        response.EnsureSuccessStatusCode();
        var html = await response.Content.ReadAsStringAsync();
        Assert.Equal(7, Regex.Matches(html, "<section class=\"media-credit\"").Count);
        Assert.Equal(13, Regex.Matches(html, "<strong>(Poster|Backdrop):</strong>").Count);
        Assert.Equal(2, Regex.Matches(html, "Music: Torin Borrowdale").Count);
        Assert.Contains("Sound design: Sander Houtman", html);
        Assert.Contains("caminandes_gran_dillama.mp4.zip", html);
        Assert.Contains("www.caminandes.org", html);
        Assert.Contains("licence and attribution follow its closing card", html);
        Assert.Contains("ten subtitle tracks omitted", html);
        Assert.Contains("CC BY 2.5", html);
        Assert.Contains("https://durian.blender.org/news/movie-poster/", html);
    }
}
