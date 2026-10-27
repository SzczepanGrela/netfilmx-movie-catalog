using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;

namespace NetFilmx_Web.Playback;

public sealed record PlaybackTrack(string TrackKey, string Language, string Label, string Url);
public sealed record PlaybackAccess(string Url, PlaybackTrack[] Subtitles, long ExpiresAt, string CatalogueVersion);

public sealed class PlaybackGrantIssuer(IConfiguration configuration, PlaybackCatalogue catalogue, TimeProvider clock) : IDisposable
{
    private readonly object _lock = new();
    private RSA? _key;
    public bool Enabled => configuration.GetValue<bool>("Playback:Enabled");

    public PlaybackAccess Issue(string film, PlaybackFilm metadata)
    {
        if (!Enabled) throw new InvalidOperationException("Playback is in closed maintenance.");
        var issuer = Required("Playback:Issuer"); var audience = Required("Playback:Audience");
        if (issuer.Length > 256 || audience.Length > 256) throw new InvalidOperationException("Playback issuer/audience exceed bounds.");
        var kid = Required("Playback:KeyId");
        if (!System.Text.RegularExpressions.Regex.IsMatch(kid, "^[a-zA-Z0-9_-]{1,64}$")) throw new InvalidOperationException("Invalid playback key ID.");
        Uri origin;
        try { origin = NetFilmx_Storage.PostgreSql.Catalogue.CataloguePlan.ValidateBaseUrl(Required("Playback:GatewayUrl")); }
        catch (NetFilmx_Storage.PostgreSql.Catalogue.CatalogueImportException) { throw new InvalidOperationException("Invalid playback gateway origin."); }
        var now = clock.GetUtcNow().ToUnixTimeSeconds();
        var claims = new { iss = issuer, aud = audience, film, ver = catalogue.Data.Version, iat = now, nbf = now, exp = now + 1800, jti = Guid.NewGuid().ToString("N") };
        string grant;
        lock (_lock)
        {
            if (_key is null)
            {
                var path = Required("Playback:SigningKeyPath");
                if (!Path.IsPathFullyQualified(path) || !File.Exists(path) || new FileInfo(path).Length > 16384)
                    throw new InvalidOperationException("Private playback signing key file required.");
                if (!OperatingSystem.IsWindows() && (File.GetUnixFileMode(path) & (UnixFileMode.GroupRead | UnixFileMode.GroupWrite | UnixFileMode.GroupExecute | UnixFileMode.OtherRead | UnixFileMode.OtherWrite | UnixFileMode.OtherExecute)) != 0)
                    throw new InvalidOperationException("Playback key file must be private.");
                var key = RSA.Create();
                try { key.ImportFromPem(File.ReadAllText(path)); _ = key.ExportParameters(true); }
                catch { key.Dispose(); throw new InvalidOperationException("Invalid private playback key."); }
                if (key.KeySize is < 2048 or > 4096) { key.Dispose(); throw new InvalidOperationException("Playback RSA key must be 2048–4096 bits."); }
                _key = key;
            }
            grant = Sign(_key, kid, claims);
        }
        var prefix = new Uri(origin, "g/" + grant + "/" + film + "/").AbsoluteUri;
        return new PlaybackAccess(prefix + metadata.Master,
            metadata.Subtitles.Select(t => new PlaybackTrack(t.TrackKey, t.Language, t.Label, prefix + t.ObjectKey)).ToArray(), now + 1800, catalogue.Data.Version);
    }
    private string Required(string name) => !string.IsNullOrWhiteSpace(configuration[name]) ? configuration[name]! : throw new InvalidOperationException("Incomplete playback configuration.");
    public static string Sign(RSA key, string kid, object claims)
    {
        var header = Base64UrlEncoder.Encode(JsonSerializer.SerializeToUtf8Bytes(new { alg = "RS256", typ = "nfx-playback+jwt", kid }));
        var payload = Base64UrlEncoder.Encode(JsonSerializer.SerializeToUtf8Bytes(claims));
        var message = header + "." + payload;
        return message + "." + Base64UrlEncoder.Encode(key.SignData(Encoding.ASCII.GetBytes(message), HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1));
    }
    public void Dispose() { _key?.Dispose(); }
}
