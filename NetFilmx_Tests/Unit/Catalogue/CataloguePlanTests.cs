using NetFilmx_Storage.PostgreSql.Catalogue;

namespace NetFilmx_Tests.Unit.Catalogue;

public sealed class CataloguePlanTests
{
    [Fact]
    public void RetainedPlan_IsReadyWithSevenPublishedHlsMastersAndRetainedOriginals()
    {
        var plan = CataloguePlan.Load();
        Assert.Equal(7, plan.Videos.Length);
        Assert.Equal(7, plan.Videos.Select(v => v.Slug).Distinct().Count());
        Assert.Equal(3, plan.Videos.Count(v => v.SeriesSlug == "caminandes"));
        plan.EnsureReadyForImport();
        Assert.All(plan.Videos, v =>
        {
            Assert.StartsWith($"videos/hls/{v.Slug}/", v.PlaybackObjectKey);
            Assert.EndsWith("/master.m3u8", v.PlaybackObjectKey);
            Assert.NotEqual(v.SourceObjectKey, v.PlaybackObjectKey);
        });
        Assert.Equal("videos/sintel.mkv", plan.Videos[0].SourceObjectKey);
        var incomplete = plan with { Videos = plan.Videos.Select((v, i) => i == 0 ? v with { PlaybackObjectKey = null } : v).ToArray() };
        Assert.Throws<CatalogueImportException>(incomplete.EnsureReadyForImport);
    }

    [Theory]
    [InlineData("subtitles/../private.vtt")]
    [InlineData("subtitles/track.srt")]
    [InlineData("https://other.example.test/track.vtt")]
    [InlineData("subtitles/track.vtt?token=private")]
    public void PlanRejectsUnreviewedSubtitleKeys(string key)
    {
        var plan=CataloguePlan.Load();var videos=plan.Videos.ToArray();
        var tracks=videos[0].Subtitles!.ToArray();tracks[0]=tracks[0] with {ObjectKey=key};
        videos[0]=videos[0] with {Subtitles=tracks};
        Assert.Throws<CatalogueImportException>(()=>(plan with {Videos=videos}).Validate());
    }

    [Fact]
    public void SintelRequiresAllTenLanguagesAndUnpublishedSidecarsBlockImport()
    {
        var plan=CataloguePlan.Load();var tracks=plan.Videos[0].Subtitles!;
        Assert.Equal(new[]{"de","en","es","fr","it","nl","pl","pt","ru","vi"},tracks.Select(t=>t.Language));
        Assert.All(tracks,t=>Assert.EndsWith(".vtt",t.ObjectKey));
        var playbackOnly=plan with {Videos=plan.Videos.Select(v=>v with {Subtitles=v.Subtitles?.Select(t=>t with {ObjectKey=null}).ToArray()}).ToArray()};
        Assert.Contains("pending subtitle",Assert.Throws<CatalogueImportException>(playbackOnly.EnsureReadyForImport).Message);
        var complete=playbackOnly with {Videos=playbackOnly.Videos.Select(v=>v with {Subtitles=v.Subtitles?.Select(t=>t with {ObjectKey=$"subtitles/test/{v.Slug}/{t.TrackKey}.vtt"}).ToArray()}).ToArray()};
        complete.EnsureReadyForImport();
        var videos=complete.Videos.ToArray();videos[0]=videos[0] with {Subtitles=[tracks[0],tracks[0]]};
        Assert.Throws<CatalogueImportException>(()=>(complete with {Videos=videos}).Validate());
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
