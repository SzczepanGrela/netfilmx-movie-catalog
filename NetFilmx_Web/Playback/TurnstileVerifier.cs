using System.Text.Json;

namespace NetFilmx_Web.Playback;

public interface ITurnstileVerifier
{
    Task<bool> VerifyAsync(string? token, string action, CancellationToken cancellationToken);
}

// No success cache, automatic retry, configurable endpoint or production bypass.
// Siteverify is the authoritative global single-use check, across app instances.
public sealed class TurnstileVerifier(HttpClient client, IConfiguration configuration, TimeProvider clock) : ITurnstileVerifier
{
    public const string PlaybackAction = "netfilmx-playback";
    public const string AdminAction = "netfilmx-admin-login";
    public async Task<bool> VerifyAsync(string? token, string action, CancellationToken cancellationToken)
    {
        var secret = configuration["Turnstile:SecretKey"];
        var hostname = configuration["Turnstile:ExpectedHostname"];
        var sitekey = configuration["Turnstile:SiteKey"];
        // Cloudflare's well-known testing credentials are never a delivery option.
        static bool TestKey(string? value) => value is not null && System.Text.RegularExpressions.Regex.IsMatch(value, "^[123]x00000000000000000000");
        if (TestKey(secret) || TestKey(sitekey) || string.IsNullOrWhiteSpace(sitekey) || string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(hostname)
            || string.IsNullOrWhiteSpace(token) || token.Length > 2048 || token.Any(char.IsControl)
            || action is not (PlaybackAction or AdminAction)) return false;
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(TimeSpan.FromSeconds(3));
        try
        {
            using var form = new FormUrlEncodedContent(new Dictionary<string, string> { ["secret"] = secret, ["response"] = token });
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://challenges.cloudflare.com/turnstile/v0/siteverify") { Content = form };
            using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, deadline.Token);
            if (!response.IsSuccessStatusCode || response.Content.Headers.ContentLength > 16384) return false;
            await using var stream = await response.Content.ReadAsStreamAsync(deadline.Token);
            var bytes = new byte[16385];
            int count = 0, read;
            while (count < bytes.Length && (read = await stream.ReadAsync(bytes.AsMemory(count), deadline.Token)) > 0) count += read;
            if (count == bytes.Length) return false;
            using var json = JsonDocument.Parse(bytes.AsMemory(0, count), new JsonDocumentOptions { MaxDepth = 8 });
            var data = json.RootElement;
            var now = clock.GetUtcNow();
            return data.GetProperty("success").GetBoolean()
                && data.GetProperty("hostname").GetString() == hostname
                && data.GetProperty("action").GetString() == action
                && DateTimeOffset.TryParse(data.GetProperty("challenge_ts").GetString(), System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.AssumeUniversal, out var issued)
                && issued <= now.AddSeconds(30) && issued >= now.AddMinutes(-5);
        }
        catch (Exception error) when (error is HttpRequestException or OperationCanceledException or JsonException or InvalidOperationException or KeyNotFoundException or FormatException)
        { return false; }
    }
}
