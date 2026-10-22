using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NetFilmx_Web.Security;

namespace NetFilmx_Tests.Integration;

public class HttpSecurityTests
{
    // Synthetic peer/identity injection exists only in this isolated test host.
    private static TestServer Server(bool trusted = true, int seconds = 60,
        TaskCompletionSource? first = null, TaskCompletionSource? second = null, TaskCompletionSource? release = null)
    {
        var values = new Dictionary<string, string?>
        {
            ["RateLimits:Login"] = release == null ? "2" : "100",
            ["RateLimits:Write"] = "2", ["RateLimits:WindowSeconds"] = seconds.ToString()
        };
        if (trusted)
        {
            values["Proxy:KnownProxies:0"] = "192.0.2.10";
            values["Proxy:KnownProxies:1"] = "192.0.2.11";
        }
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(values).Build();
        var active = 0;
        return new TestServer(new WebHostBuilder().ConfigureServices(services =>
        {
            services.AddRouting(); services.AddHttpSecurity(configuration);
        }).Configure(app =>
        {
            app.Use(async (context, next) =>
            {
                context.Connection.RemoteIpAddress = IPAddress.Parse(context.Request.Headers["X-Test-Peer"].FirstOrDefault() ?? "192.0.2.10");
                var user = context.Request.Headers["X-Test-User"].FirstOrDefault();
                if (user != null) context.User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, user) }, "test"));
                await next();
            });
            app.UseForwardedHeaders(); app.UseRouting(); app.UseRateLimiter();
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapPost("/auth/login", async context =>
                {
                    if (Interlocked.Increment(ref active) == 1) first?.TrySetResult(); else second?.TrySetResult();
                    if (release != null) await release.Task.WaitAsync(TimeSpan.FromSeconds(10));
                    context.Response.StatusCode = 204;
                }).WithMetadata(new ControllerActionDescriptor { ControllerName = "Auth", ActionName = "Login" });
                endpoints.MapPost("/write", context => { context.Response.StatusCode = 204; return Task.CompletedTask; });
                endpoints.MapGet("/auth/login", context => { context.Response.StatusCode = 204; return Task.CompletedTask; });
                endpoints.MapGet("/identity", context => context.Response.WriteAsJsonAsync(new
                {
                    ip = context.Connection.RemoteIpAddress?.ToString(), scheme = context.Request.Scheme, host = context.Request.Host.Value
                }));
            });
        }));
    }

    private static async Task<HttpResponseMessage> Post(HttpClient client, string ip = "198.51.100.20", string peer = "192.0.2.10",
        string path = "/auth/login", string? user = null, string? forwarded = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, path);
        request.Headers.Add("X-Test-Peer", peer);
        request.Headers.Add("X-Forwarded-For", forwarded ?? ip + ", 192.0.2.11");
        request.Headers.Add("CF-Connecting-IP", Guid.NewGuid().ToString());
        if (user != null) request.Headers.Add("X-Test-User", user);
        return await client.SendAsync(request);
    }

    [Fact]
    public async Task TwoTrustedHops_SeparateClients_IgnoreForgedLeftmostAddress()
    {
        using var server = Server(); using var client = server.CreateClient();
        using var one = await Post(client); using var two = await Post(client);
        using var blocked = await Post(client, forwarded: "203.0.113.99, 198.51.100.20, 192.0.2.11");
        Assert.Equal(HttpStatusCode.NoContent, one.StatusCode); Assert.Equal(HttpStatusCode.NoContent, two.StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);
        Assert.NotNull(blocked.Headers.RetryAfter); Assert.True(blocked.Headers.CacheControl?.NoStore);
        Assert.Equal("rate_limit_exceeded", (await blocked.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("error").GetString());
        using var independent = await Post(client, ip: "198.51.100.21");
        Assert.Equal(HttpStatusCode.NoContent, independent.StatusCode);
    }

    [Theory]
    [InlineData(false, "192.0.2.10")]
    [InlineData(true, "192.0.2.200")]
    public async Task MissingTrustOrUnknownPeer_RejectRotatingForwardedAddresses(bool trusted, string peer)
    {
        using var server = Server(trusted); using var client = server.CreateClient();
        using var one = await Post(client, "198.51.100.20", peer);
        using var two = await Post(client, "198.51.100.21", peer);
        using var blocked = await Post(client, "198.51.100.22", peer);
        Assert.Equal(HttpStatusCode.NoContent, one.StatusCode); Assert.Equal(HttpStatusCode.NoContent, two.StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);
    }

    [Fact]
    public async Task UnknownIntermediateHop_StopsProcessingSpoofedVisitorAddress()
    {
        using var server = Server(); using var client = server.CreateClient();
        using var one = await Post(client, forwarded: "198.51.100.20, 192.0.2.99");
        using var two = await Post(client, forwarded: "198.51.100.21, 192.0.2.99");
        using var blocked = await Post(client, forwarded: "198.51.100.22, 192.0.2.99");
        Assert.Equal(HttpStatusCode.NoContent, one.StatusCode); Assert.Equal(HttpStatusCode.NoContent, two.StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);
    }

    [Fact]
    public async Task MappedPeerAndTrustedProto_NormalizeIp_AndIgnoreForwardedHost()
    {
        using var server = Server(); using var client = server.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/identity");
        request.Headers.Add("X-Test-Peer", "::ffff:192.0.2.10");
        request.Headers.Add("X-Forwarded-For", "198.51.100.20, 192.0.2.11");
        request.Headers.Add("X-Forwarded-Proto", "https, http");
        request.Headers.Add("X-Forwarded-Host", "attacker.example");
        using var response = await client.SendAsync(request);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("198.51.100.20", body.GetProperty("ip").GetString());
        Assert.Equal("https", body.GetProperty("scheme").GetString());
        Assert.Equal(client.BaseAddress!.Authority, body.GetProperty("host").GetString());
    }

    [Fact]
    public async Task WriteBudget_FollowsAuthenticatedIdentityAcrossAddresses_LeavesReadsAvailable()
    {
        using var server = Server(); using var client = server.CreateClient();
        using var one = await Post(client, "198.51.100.20", path: "/write", user: "42");
        using var two = await Post(client, "198.51.100.21", path: "/write", user: "42");
        using var blocked = await Post(client, "198.51.100.22", path: "/write", user: "42");
        using var other = await Post(client, path: "/write", user: "43");
        using var read = await client.GetAsync("/auth/login");
        Assert.Equal(HttpStatusCode.NoContent, one.StatusCode); Assert.Equal(HttpStatusCode.NoContent, two.StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, other.StatusCode); Assert.Equal(HttpStatusCode.NoContent, read.StatusCode);
    }

    [Fact]
    public async Task WindowRecovery_AllowsRequestsAfterExpiry()
    {
        using var server = Server(seconds: 1); using var client = server.CreateClient();
        using var one = await Post(client); using var two = await Post(client); using var blocked = await Post(client);
        Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);
        await Task.Delay(1300);
        using var recovered = await Post(client); Assert.Equal(HttpStatusCode.NoContent, recovered.StatusCode);
    }

    [Fact]
    public async Task PasswordWork_HasGlobalConcurrencyLimit_AndReleasesPermits()
    {
        var first = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var second = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var server = Server(first: first, second: second, release: release); using var client = server.CreateClient();
        var one = Post(client, "198.51.100.20");
        await first.Task.WaitAsync(TimeSpan.FromSeconds(5));
        var two = Post(client, "198.51.100.21");
        try
        {
            await second.Task.WaitAsync(TimeSpan.FromSeconds(5));
            using var blocked = await Post(client, "198.51.100.22");
            Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);
        }
        finally { release.TrySetResult(); }
        using var a = await one; using var b = await two;
        Assert.Equal(HttpStatusCode.NoContent, a.StatusCode); Assert.Equal(HttpStatusCode.NoContent, b.StatusCode);
        using var recovered = await Post(client, "198.51.100.22"); Assert.Equal(HttpStatusCode.NoContent, recovered.StatusCode);
    }

    [Theory]
    [InlineData("0.0.0.0")]
    [InlineData("192.0.2.0/24")]
    [InlineData("*")]
    public void BroadProxyTrust_IsRejected(string address)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Proxy:KnownProxies:0"] = address }).Build();
        var services = new ServiceCollection(); services.AddLogging(); services.AddHttpSecurity(config);
        using var provider = services.BuildServiceProvider();
        Assert.Throws<InvalidOperationException>(() => provider.GetRequiredService<Microsoft.Extensions.Options.IOptions<ForwardedHeadersOptions>>().Value);
    }

    [Theory]
    [InlineData("ForwardedHeaders_Enabled")]
    [InlineData("ASPNETCORE_FORWARDEDHEADERS_ENABLED")]
    public void AutomaticTrustAllSwitch_IsRejected(string key)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { [key] = "true" }).Build();
        Assert.Throws<InvalidOperationException>(() => new ServiceCollection().AddHttpSecurity(config));
    }
}
