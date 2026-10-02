using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NetFilmx_Storage.Context;
using NetFilmx_Service.Security;
using NetFilmx_Tests.Integration.Fixtures;

namespace NetFilmx_Tests.Integration;

public class AuthFlowTests : IDisposable
{
    private readonly TestWebApplicationFactory<Program> _factory = new();
    public void Dispose() => _factory.Dispose();

    [Theory]
    [InlineData("not-an-email", "Password123!")]
    [InlineData("valid@example.test", "short")]
    public async Task InvalidRegistration_DoesNotCreateAccount(string email, string password)
    {
        using var browser = new AuthBrowser(_factory);
        var name = "invalid" + Guid.NewGuid().ToString("N");
        var token = await browser.FormTokenAsync("/auth/register");
        using var response = await browser.SendAsync(HttpMethod.Post, "/auth/register", new()
        {
            ["Username"] = name, ["Email"] = email, ["Password"] = password, ["__RequestVerificationToken"] = token
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode); Assert.Empty(browser.Cookie("access_token"));
        using var scope = _factory.Services.CreateScope();
        Assert.False(await scope.ServiceProvider.GetRequiredService<NetFilmxDbContext>().Users.AnyAsync(u => u.Username == name));
    }

    [Fact]
    public async Task Registration_RefreshRotation_Logout_RejectTokenReplay()
    {
        using var browser = new AuthBrowser(_factory);
        using var registered = await browser.RegisterAsync("flow" + Guid.NewGuid().ToString("N"));
        Assert.Equal(HttpStatusCode.Redirect, registered.StatusCode);
        var oldRefresh = browser.Cookie("refresh_token");
        Assert.NotEmpty(oldRefresh);
        Assert.NotEmpty(browser.Cookie("access_token"));
        Assert.All(registered.Headers.GetValues("Set-Cookie").Where(c => c.StartsWith("access_token=") || c.StartsWith("refresh_token=")),
            c => { Assert.Contains("secure", c); Assert.Contains("httponly", c); Assert.Contains("samesite=strict", c); });
        using var forbidden = await browser.SendAsync(HttpMethod.Get, "/admin/category");
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        using var getLogout = await browser.SendAsync(HttpMethod.Get, "/auth/logout");
        Assert.Equal(HttpStatusCode.MethodNotAllowed, getLogout.StatusCode);
        foreach (var url in new[] { "/auth/logout", "/auth/refresh" })
        {
            using var missingCsrf = await browser.SendAsync(HttpMethod.Post, url);
            Assert.Equal(HttpStatusCode.BadRequest, missingCsrf.StatusCode);
        }
        var csrf = await browser.CsrfAsync();
        using var refreshed = await browser.SendAsync(HttpMethod.Post, "/auth/refresh", csrf: csrf);
        Assert.Equal(HttpStatusCode.OK, refreshed.StatusCode);
        var newRefresh = browser.Cookie("refresh_token");
        Assert.NotEqual(oldRefresh, newRefresh);

        using var replay = new AuthBrowser(_factory);
        replay.SetCookie("refresh_token", oldRefresh);
        using var oldRejected = await replay.SendAsync(HttpMethod.Post, "/auth/refresh", csrf: await replay.CsrfAsync());
        Assert.Equal(HttpStatusCode.Unauthorized, oldRejected.StatusCode);

        using var logout = await browser.SendAsync(HttpMethod.Post, "/auth/logout", csrf: await browser.CsrfAsync());
        Assert.Equal(HttpStatusCode.Redirect, logout.StatusCode);
        Assert.Empty(browser.Cookie("refresh_token"));
        Assert.Empty(browser.Cookie("access_token"));
        using var anonymous = await browser.SendAsync(HttpMethod.Get, "/admin/category");
        Assert.Equal(HttpStatusCode.Redirect, anonymous.StatusCode);
        replay.SetCookie("refresh_token", newRefresh);
        using var logoutRejected = await replay.SendAsync(HttpMethod.Post, "/auth/refresh", csrf: await replay.CsrfAsync());
        Assert.Equal(HttpStatusCode.Unauthorized, logoutRejected.StatusCode);
    }

    [Theory]
    [InlineData("/auth/register")]
    [InlineData("/auth/login")]
    public async Task LoginAndRegistration_RejectMissingCsrf(string path)
    {
        using var browser = new AuthBrowser(_factory);
        using var response = await browser.SendAsync(HttpMethod.Post, path, new()
        {
            ["Username"] = "forged", ["Password"] = "Password123!", ["Email"] = "forged@example.test"
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(browser.Cookie("access_token"));
    }

    [Fact]
    public async Task RememberedLogin_RotationPreservesExpiry_AndExternalReturnUrlIsIgnored()
    {
        var name = "remember" + Guid.NewGuid().ToString("N");
        using (var register = new AuthBrowser(_factory))
        using (var response = await register.RegisterAsync(name)) Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        using var browser = new AuthBrowser(_factory);
        using var login = await browser.LoginAsync(name, true, "https://external.example/");
        Assert.Equal(HttpStatusCode.Redirect, login.StatusCode);
        Assert.Equal("/", login.Headers.Location?.OriginalString);
        async Task<DateTime> Expiry()
        {
            using var scope = _factory.Services.CreateScope();
            var raw = Uri.UnescapeDataString(browser.Cookie("refresh_token"));
            var hash = scope.ServiceProvider.GetRequiredService<ISessionService>().HashToken(raw);
            return (await scope.ServiceProvider.GetRequiredService<NetFilmxDbContext>().UserSessions.SingleAsync(s => s.RefreshTokenHash == hash)).ExpiresAt;
        }
        var expiry = await Expiry();
        Assert.True(expiry > DateTime.UtcNow.AddDays(29));
        using var response2 = await browser.SendAsync(HttpMethod.Post, "/auth/refresh", csrf: await browser.CsrfAsync());
        Assert.Equal(HttpStatusCode.OK, response2.StatusCode);
        Assert.Equal(expiry, await Expiry());
    }
}
