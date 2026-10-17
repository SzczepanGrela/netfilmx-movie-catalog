namespace NetFilmx_Web.Security;

// Stored catalogue references may only target the configured HTTPS media origin.
public sealed class MediaReferencePolicy
{
    private readonly Uri? _origin;

    public MediaReferencePolicy(IConfiguration configuration)
    {
        var value = configuration["CloudflareR2:PublicUrl"];
        if (string.IsNullOrWhiteSpace(value)) return;
        if (!Uri.TryCreate(value, UriKind.Absolute, out var origin) || origin.Scheme != Uri.UriSchemeHttps
            || origin.UserInfo.Length != 0 || origin.AbsolutePath != "/" || origin.Query.Length != 0 || origin.Fragment.Length != 0)
            throw new InvalidOperationException("CloudflareR2:PublicUrl must be a bare HTTPS origin.");
        _origin = origin;
    }

    public bool Allows(string? value) => _origin != null && value?.Length <= 2048
        && Uri.TryCreate(value, UriKind.Absolute, out var url) && url.Scheme == Uri.UriSchemeHttps
        && string.Equals(url.IdnHost, _origin.IdnHost, StringComparison.OrdinalIgnoreCase) && url.Port == _origin.Port
        && url.UserInfo.Length == 0 && url.Query.Length == 0 && url.Fragment.Length == 0 && url.AbsolutePath.Length > 1;
}
