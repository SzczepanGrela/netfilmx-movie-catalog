using NetFilmx_Storage.PostgreSql.Catalogue;

namespace NetFilmx_Tests.Unit.Catalogue;

public sealed class CataloguePlanTests
{
    [Fact]
    public void RetainedPlan_SeparatesOriginalObjectsFromPendingPlayback()
    {
        var plan = CataloguePlan.Load();
        Assert.Equal(7, plan.Videos.Length);
        Assert.Equal(7, plan.Videos.Select(v => v.Slug).Distinct().Count());
        Assert.Equal(3, plan.Videos.Count(v => v.SeriesSlug == "caminandes"));
        Assert.Equal(new[] { "caminandes-llama-drama", "sintel" },
            plan.Videos.Where(v => v.PlaybackObjectKey is null).Select(v => v.Slug).Order().ToArray());
        Assert.Throws<CatalogueImportException>(plan.EnsureReadyForImport);
    }

    [Theory]
    [InlineData("videos/../private/file.mp4")]
    [InlineData("videos/%2e%2e/private.mp4")]
    [InlineData("https://other.example.test/file.mp4")]
    [InlineData("videos/file.mp4?token=do-not-store")]
    [InlineData("videos//file.mp4")]
    [InlineData("videos\\file.mp4")]
    public void Plan_RejectsUnsafeObjectKeys(string key)
    {
        var plan = CataloguePlan.Load();
        var videos = plan.Videos.ToArray();
        videos[0] = videos[0] with { SourceObjectKey = key };
        Assert.Throws<CatalogueImportException>(() => (plan with { Videos = videos }).Validate());
    }

    [Fact]
    public void Plan_RejectsDuplicateFilmOrPlaybackAndUnknownSeries()
    {
        var plan = CataloguePlan.Load();
        Assert.Throws<CatalogueImportException>(() =>
            (plan with { Videos = [plan.Videos[0], plan.Videos[0]] }).Validate());
        var videos = plan.Videos.ToArray();
        videos[0] = videos[0] with { PlaybackObjectKey = videos[1].PlaybackObjectKey };
        Assert.Throws<CatalogueImportException>(() => (plan with { Videos = videos }).Validate());
        videos[0] = plan.Videos[0] with { SeriesSlug = "unknown" };
        Assert.Throws<CatalogueImportException>(() => (plan with { Videos = videos }).Validate());
    }

    [Theory]
    [InlineData("http://media.example.test")]
    [InlineData("https://user:password@media.example.test")]
    [InlineData("https://media.example.test/?token=value")]
    [InlineData("https://media.example.test/prefix/")]
    public void MediaOrigin_RejectsCredentialsAndNonOriginUrls(string origin)
    {
        Assert.Throws<CatalogueImportException>(() => CataloguePlan.ValidateBaseUrl(origin));
    }
}
