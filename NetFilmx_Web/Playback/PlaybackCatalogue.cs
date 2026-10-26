using System.Text.Json;
using System.Text.Json.Serialization;
using NetFilmx_Storage.PostgreSql.Catalogue;

namespace NetFilmx_Web.Playback;

public sealed record PlaybackFilm(string Title, string Master, CatalogueSubtitle[] Subtitles);
public sealed record PlaybackCatalogueData(string Version, string ManifestSha256, Dictionary<string, PlaybackFilm> Films);

public sealed class PlaybackCatalogue
{
    public PlaybackCatalogueData Data { get; }
    public PlaybackCatalogue()
    {
        using var stream = typeof(PlaybackCatalogue).Assembly.GetManifestResourceStream("NetFilmx.PlaybackCatalogue.json")!;
        Data = JsonSerializer.Deserialize<PlaybackCatalogueData>(stream, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
    }
    public KeyValuePair<string, PlaybackFilm>? Find(string url, string? origin)
    {
        if (string.IsNullOrWhiteSpace(origin)) return null;
        var baseUri = CataloguePlan.ValidateBaseUrl(origin);
        foreach (var item in Data.Films)
            if (new Uri(baseUri, item.Value.Master).AbsoluteUri == url) return item;
        return null;
    }
}
