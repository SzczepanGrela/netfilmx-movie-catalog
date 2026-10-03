using System.Net;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.Extensions.DependencyInjection;
using NetFilmx_Tests.Integration.Fixtures;

namespace NetFilmx_Tests.Integration;

public sealed class DataProtectionTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "netfilmx-key-tests-" + Guid.NewGuid().ToString("N"));
    private string Keys => Path.Combine(_directory, "keys");
    private string Database => Path.Combine(_directory, "test.db");

    public DataProtectionTests()
    {
        if (OperatingSystem.IsWindows()) Directory.CreateDirectory(Keys);
        else Directory.CreateDirectory(Keys, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
    }

    [Fact]
    public async Task AntiforgeryCookieAndForm_SurviveHostRestart()
    {
        var first = new TestWebApplicationFactory<Program>(Database, Keys);
        using var browser = new AuthBrowser(first);
        var token = await browser.FormTokenAsync("/auth/login");
        Assert.NotEmpty(browser.Cookie("__Host-NetFilmx.Antiforgery"));
        first.Dispose();

        using var restarted = new TestWebApplicationFactory<Program>(Database, Keys);
        browser.UseInstance(restarted);
        await SubmitLoginAsync(browser, token, HttpStatusCode.OK);
        await SubmitLoginAsync(browser, token + "invalid", HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task TwoLiveHosts_AcceptEachOthersAntiforgeryTokens()
    {
        using var first = new TestWebApplicationFactory<Program>(Database, Keys);
        using var second = new TestWebApplicationFactory<Program>(Database, Keys);
        using var browser = new AuthBrowser(first);
        var firstToken = await browser.FormTokenAsync("/auth/login");
        browser.UseInstance(second);
        await SubmitLoginAsync(browser, firstToken, HttpStatusCode.OK);
        var secondToken = await browser.FormTokenAsync("/auth/login");
        browser.UseInstance(first);
        await SubmitLoginAsync(browser, secondToken, HttpStatusCode.OK);
    }

    [Fact]
    public async Task RotatedKeyRing_RetainsOldPayloadAndAntiforgeryToken()
    {
        using var first = new TestWebApplicationFactory<Program>(Database, Keys);
        using var browser = new AuthBrowser(first);
        var token = await browser.FormTokenAsync("/auth/login");
        var protector = first.Services.GetRequiredService<IDataProtectionProvider>().CreateProtector("retention-test");
        var payload = protector.Protect("old payload");
        var manager = first.Services.GetRequiredService<IKeyManager>();
        var before = manager.GetAllKeys().Select(k => k.KeyId).ToArray();
        manager.CreateNewKey(DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddDays(90));

        using var next = new TestWebApplicationFactory<Program>(Database, Keys);
        browser.UseInstance(next);
        await SubmitLoginAsync(browser, token, HttpStatusCode.OK);
        Assert.Equal("old payload", next.Services.GetRequiredService<IDataProtectionProvider>()
            .CreateProtector("retention-test").Unprotect(payload));
        var after = next.Services.GetRequiredService<IKeyManager>().GetAllKeys();
        Assert.All(before, id => Assert.Contains(after, k => k.KeyId == id));
        Assert.True(after.Count > before.Length);
    }

    [Fact]
    public async Task SeparateKeyRing_RejectsOldAntiforgeryToken()
    {
        using var first = new TestWebApplicationFactory<Program>(Database, Keys);
        using var other = new TestWebApplicationFactory<Program>();
        using var browser = new AuthBrowser(first);
        var token = await browser.FormTokenAsync("/auth/login");
        browser.UseInstance(other);
        await SubmitLoginAsync(browser, token, HttpStatusCode.BadRequest);
    }

    private static async Task SubmitLoginAsync(AuthBrowser browser, string token, HttpStatusCode expected)
    {
        using var response = await browser.SendAsync(HttpMethod.Post, "/auth/login", new()
        {
            ["Username"] = "nonexistent", ["Password"] = "Password123!", ["__RequestVerificationToken"] = token
        });
        Assert.Equal(expected, response.StatusCode);
        Assert.Empty(browser.Cookie("access_token"));
    }

    public void Dispose() => Directory.Delete(_directory, recursive: true);
}
