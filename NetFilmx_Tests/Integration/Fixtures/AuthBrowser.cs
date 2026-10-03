using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.Testing;

namespace NetFilmx_Tests.Integration.Fixtures;

// Real MVC forms and cookie handling; no authentication bypass or generated JWTs.
internal sealed class AuthBrowser : IDisposable
{
    private HttpClient _client;
    private readonly CookieContainer _cookies = new();
    private static readonly Uri Origin = new("https://localhost");
    public AuthBrowser(TestWebApplicationFactory<Program> factory) => _client = factory.CreateClient(new()
    {
        BaseAddress = Origin, AllowAutoRedirect = false, HandleCookies = false
    });

    public string Cookie(string name) => _cookies.GetCookies(Origin)[name]?.Value ?? "";
    public void UseInstance(TestWebApplicationFactory<Program> factory)
    {
        _client.Dispose();
        _client = factory.CreateClient(new() { BaseAddress = Origin, AllowAutoRedirect = false, HandleCookies = false });
    }
    public void SetCookie(string name, string value) => _cookies.Add(Origin, new Cookie(name, value, "/") { Secure = true });

    public async Task<HttpResponseMessage> SendAsync(HttpMethod method, string url, Dictionary<string, string>? form = null, string? csrf = null)
    {
        using var request = new HttpRequestMessage(method, url);
        var cookies = _cookies.GetCookieHeader(Origin);
        if (cookies.Length > 0) request.Headers.Add("Cookie", cookies);
        if (csrf != null) request.Headers.Add("X-CSRF-TOKEN", csrf);
        if (form != null) request.Content = new FormUrlEncodedContent(form);
        var response = await _client.SendAsync(request);
        if (response.Headers.TryGetValues("Set-Cookie", out var values))
            foreach (var value in values) _cookies.SetCookies(Origin, value);
        return response;
    }

    public async Task<string> FormTokenAsync(string url)
    {
        using var response = await SendAsync(HttpMethod.Get, url);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var html = await response.Content.ReadAsStringAsync();
        var input = Regex.Match(html, "<input[^>]*name=\"__RequestVerificationToken\"[^>]*>").Value;
        var value = Regex.Match(input, "value=\"([^\"]+)\"").Groups[1].Value;
        Assert.NotEmpty(value);
        return WebUtility.HtmlDecode(value);
    }

    public async Task<string> CsrfAsync()
    {
        using var response = await SendAsync(HttpMethod.Get, "/auth/csrf");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl?.NoStore);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString()!;
    }

    public async Task<HttpResponseMessage> RegisterAsync(string name)
    {
        var token = await FormTokenAsync("/auth/register");
        return await SendAsync(HttpMethod.Post, "/auth/register", new()
        {
            ["Username"] = name, ["Email"] = name[..Math.Min(name.Length, 30)] + "@example.test", ["Password"] = "Password123!",
            ["__RequestVerificationToken"] = token
        });
    }

    public async Task<HttpResponseMessage> LoginAsync(string name, bool remember = false, string returnUrl = "/")
    {
        var token = await FormTokenAsync("/auth/login");
        return await SendAsync(HttpMethod.Post, "/auth/login?returnUrl=" + Uri.EscapeDataString(returnUrl), new()
        {
            ["Username"] = name, ["Password"] = "Password123!", ["RememberMe"] = remember.ToString(),
            ["__RequestVerificationToken"] = token
        });
    }
    public void Dispose() => _client.Dispose();
}
