using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace NetFilmx_Web.Runtime;

public static class RuntimeProbe
{
    public static async Task<int> RunAsync(bool smoke)
    {
        try
        {
            if (!Regex.IsMatch(ReleaseHealth.Revision, "^[a-f0-9]{40}$"))
                throw new InvalidOperationException("An embedded release revision is required.");
            using var handler = new HttpClientHandler { AllowAutoRedirect = false, UseCookies = false };
            using var client = new HttpClient(handler) { BaseAddress = new Uri("http://127.0.0.1:8080"), Timeout = TimeSpan.FromSeconds(4) };
            using var ready = await client.GetAsync("/health/ready");
            ready.EnsureSuccessStatusCode();
            var payload = await ready.Content.ReadFromJsonAsync<JsonElement>();
            if (payload.GetProperty("status").GetString() != "ready" || payload.GetProperty("revision").GetString() != ReleaseHealth.Revision)
                throw new InvalidOperationException("Health payload or revision differs from this image.");
            if (smoke)
            {
                foreach (var path in new[] { "/", "/home/movies", "/home/series", "/favicon.ico", "/js/site.js" })
                {
                    using var response = await client.GetAsync(path);
                    if (response.StatusCode != HttpStatusCode.OK || (await response.Content.ReadAsByteArrayAsync()).Length == 0)
                        throw new InvalidOperationException("A required catalogue page or asset is unavailable.");
                }
            }
            return 0;
        }
        catch
        {
            Console.Error.WriteLine(smoke ? "Runtime catalogue smoke failed." : "Runtime readiness probe failed.");
            return 1;
        }
    }
}
