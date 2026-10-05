using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace NetFilmx_Storage.PostgreSql.Catalogue;

public sealed class CatalogueImportException(string message) : Exception(message);

public sealed record CatalogueVideo(
    string Slug, string Title, string Description, decimal Price, int ReleaseYear,
    string SourceObjectKey, string? PlaybackObjectKey, string PosterObjectKey,
    string? BackdropObjectKey = null, string? SeriesSlug = null);

public sealed record CatalogueSeries(string Slug, string Name, string Description, decimal Price);

public sealed record CataloguePlan(int SchemaVersion, CatalogueSeries[] Series, CatalogueVideo[] Videos)
{
    public static CataloguePlan Load()
    {
        using var stream = typeof(CataloguePlan).Assembly.GetManifestResourceStream(
            "NetFilmx_Storage.PostgreSql.Catalogue.retained-media.json")!;
        var plan = JsonSerializer.Deserialize<CataloguePlan>(stream, new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow
        }) ?? throw new CatalogueImportException("Missing catalogue plan.");
        plan.Validate();
        return plan;
    }

    public void Validate()
    {
        if (SchemaVersion != 1 || Videos is null || Videos.Length == 0 || Series is null)
            throw new CatalogueImportException("Unsupported or empty catalogue plan.");
        var slugs = new HashSet<string>(StringComparer.Ordinal);
        foreach (var series in Series)
        {
            ValidateSlug(series.Slug);
            if (!slugs.Add(series.Slug)) throw new CatalogueImportException("Duplicate series slug.");
            ValidateText(series.Name, 100);
            ValidateText(series.Description, 2000);
            ValidatePrice(series.Price);
        }
        var videoSlugs = new HashSet<string>(StringComparer.Ordinal);
        var sources = new HashSet<string>(StringComparer.Ordinal);
        var playbacks = new HashSet<string>(StringComparer.Ordinal);
        foreach (var video in Videos)
        {
            ValidateSlug(video.Slug);
            if (!videoSlugs.Add(video.Slug) || !sources.Add(video.SourceObjectKey))
                throw new CatalogueImportException("Duplicate video slug or source object.");
            ValidateText(video.Title, 100);
            ValidateText(video.Description, 2000);
            ValidatePrice(video.Price);
            ValidateKey(video.SourceObjectKey, "videos/");
            ValidateKey(video.PosterObjectKey, "posters/");
            if (video.BackdropObjectKey is not null) ValidateKey(video.BackdropObjectKey, "backdrops/");
            if (video.PlaybackObjectKey is not null)
            {
                ValidateKey(video.PlaybackObjectKey, "videos/");
                if (!playbacks.Add(video.PlaybackObjectKey))
                    throw new CatalogueImportException("Different films must not share a playback object.");
                if (Path.GetExtension(video.PlaybackObjectKey) is not (".mp4" or ".webm" or ".m3u8"))
                    throw new CatalogueImportException("Playback requires a reviewed MP4, WebM or HLS object.");
            }
            if (video.SeriesSlug is not null && !slugs.Contains(video.SeriesSlug))
                throw new CatalogueImportException("Unknown series reference.");
        }
    }

    public void EnsureReadyForImport()
    {
        Validate();
        if (Videos.Any(v => v.PlaybackObjectKey is null))
            throw new CatalogueImportException("Catalogue has pending playback derivatives; nothing was imported.");
    }

    public static Uri ValidateBaseUrl(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.Scheme != "https" ||
            uri.UserInfo.Length != 0 || uri.Query.Length != 0 || uri.Fragment.Length != 0 || uri.AbsolutePath != "/")
            throw new CatalogueImportException("Media base must be an HTTPS origin without credentials, path or query.");
        return uri;
    }

    private static void ValidateSlug(string slug)
    {
        if (slug is null || !Regex.IsMatch(slug, "^[a-z0-9]+(?:-[a-z0-9]+)*$"))
            throw new CatalogueImportException("Invalid catalogue slug.");
    }

    private static void ValidateKey(string key, string prefix)
    {
        // An object key, never a remote URL, filesystem traversal or signed URL.
        if (key is null || !key.StartsWith(prefix, StringComparison.Ordinal) || key.Length > 300 ||
            !Regex.IsMatch(key, "^[a-zA-Z0-9_./-]+$") ||
            key.Split('/').Any(p => p is "" or "." or ".."))
            throw new CatalogueImportException("Invalid catalogue object key.");
    }

    private static void ValidateText(string text, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(text) || text.Length > maxLength)
            throw new CatalogueImportException("Invalid catalogue text length.");
    }

    private static void ValidatePrice(decimal price)
    {
        if (price < 0 || price > 10001 || decimal.Round(price, 2) != price)
            throw new CatalogueImportException("Invalid catalogue price.");
    }
}
