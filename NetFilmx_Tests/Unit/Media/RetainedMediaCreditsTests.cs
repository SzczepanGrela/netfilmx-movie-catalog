using NetFilmx_Service.Dtos.Video;
using NetFilmx_Storage.PostgreSql.Catalogue;
using NetFilmx_Web.Services;

namespace NetFilmx_Tests.Unit.Media;

public class RetainedMediaCreditsTests
{
    private const string Origin = "https://media.example.test";
    private static VideoCardDto Charge() => new()
    {
        Id = 12345, Title = "Translated title",
        VideoUrl = Origin + "/videos/charge.webm",
        ThumbnailUrl = Origin + "/posters/charge_poster.jpg",
        BackdropUrl = Origin + "/backdrops/charge_backdrop.jpg"
    };

    [Fact]
    public void NoticeUsesManifestReferencesRatherThanTitleOrGeneratedId()
    {
        var credit = RetainedMediaCredits.Find(Charge(), Origin);
        Assert.Equal("charge", credit?.Slug);
        Assert.Contains("Torin Borrowdale", credit!.Production);
        Assert.Contains("Sander Houtman", credit.Production);
    }

    [Theory]
    [InlineData("https://other.example.test/videos/charge.webm")]
    [InlineData(Origin + "/uploads/videos/charge.webm")]
    [InlineData(Origin + "/videos/charge.webm?different-edition=true")]
    public void AnotherOriginOrObjectDoesNotAcquireRetainedRights(string url)
    {
        var video = Charge(); video.VideoUrl = url;
        Assert.Null(RetainedMediaCredits.Find(video, Origin));
    }

    [Fact]
    public void UnreviewedArtworkAndPendingPlaybackDoNotAcquireNotices()
    {
        var video = Charge(); video.BackdropUrl = Origin + "/uploads/posters/another.jpg";
        Assert.Null(RetainedMediaCredits.Find(video, Origin));
        Assert.Null(RetainedMediaCredits.Find(Charge(), "http://media.example.test"));
        var sintel = new VideoCardDto { Title = "Sintel", VideoUrl = Origin + "/videos/sintel.mp4", ThumbnailUrl = Origin + "/posters/sintel_poster.jpg" };
        Assert.Null(RetainedMediaCredits.Find(sintel, Origin));
        Assert.Throws<CatalogueImportException>(() => CataloguePlan.Load().EnsureReadyForImport());
    }

    [Fact]
    public void GranDillamaUsesRetainedEditionCardAndArtworkLedgerCoversAllThirteen()
    {
        var gran = Assert.Single(RetainedMediaCredits.All, c => c.Slug == "caminandes-gran-dillama");
        Assert.Equal("CC BY 3.0", gran.License);
        Assert.Equal("https://creativecommons.org/licenses/by/3.0/", gran.LicenseUrl);
        Assert.Null(gran.Pending);
        Assert.EndsWith("caminandes_gran_dillama.mp4.zip", gran.SourceUrl);
        Assert.Contains("www.caminandes.org", gran.Creator);
        Assert.All(gran.Artwork, art => Assert.Equal("CC BY 3.0", art.License));
        Assert.Equal(13, RetainedMediaCredits.All.Sum(c => c.Artwork.Length));
        Assert.Equal(CataloguePlan.Load().Videos.Select(v => v.Slug), RetainedMediaCredits.All.Select(c => c.Slug));
    }
}
