using System.Collections.Concurrent;
using System.Net;
using System.Text.Json;
namespace NetFilmx_Tests.Integration.Fixtures;
// Provider simulation in the test assembly only; no production switch.
public sealed class SyntheticSiteverifyHandler : HttpMessageHandler
{
    private readonly ConcurrentDictionary<string, byte> _seen = new();
    public int Calls;
    public TimeProvider Clock { get; set; } = TimeProvider.System;
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
    {
        Interlocked.Increment(ref Calls);
        Assert.Equal("https://challenges.cloudflare.com/turnstile/v0/siteverify", request.RequestUri?.AbsoluteUri);
        var data = (await request.Content!.ReadAsStringAsync(token)).Split('&').Select(s => s.Split('=', 2))
            .ToDictionary(p => Uri.UnescapeDataString(p[0]), p => Uri.UnescapeDataString(p[1]));
        var evidence = data["response"];
        if (evidence.StartsWith("slow")) await Task.Delay(TimeSpan.FromSeconds(30), token);
        if (evidence.StartsWith("timeout")) throw new TaskCanceledException();
        if (evidence.StartsWith("unavailable")) return new HttpResponseMessage(HttpStatusCode.ServiceUnavailable);
        var success = evidence.StartsWith("mock-") && _seen.TryAdd(evidence, 0);
        var action = evidence.Contains("netfilmx-admin-login") ? "netfilmx-admin-login" : "netfilmx-playback";
        var host = evidence.Contains("wrong-host") ? "wrong.example" : "localhost";
        var issued = evidence.Contains("expired") ? Clock.GetUtcNow().AddMinutes(-6) : Clock.GetUtcNow();
        return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(new
            { success, hostname = host, action, challenge_ts = issued })) };
    }
}
