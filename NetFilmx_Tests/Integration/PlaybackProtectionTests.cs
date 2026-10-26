using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Hosting;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;
using NetFilmx_Tests.Integration.Fixtures;
using NetFilmx_Web.Playback;

namespace NetFilmx_Tests.Integration;

public class PlaybackProtectionTests : IDisposable
{
    private readonly string _key = Path.Combine(Path.GetTempPath(), "netfilmx-playback-test-"+Guid.NewGuid().ToString("N")+".pem");
    private readonly TestWebApplicationFactory<Program> _factory = new();
    private readonly RSA _rsa = RSA.Create(2048);
    public PlaybackProtectionTests()
    {
        File.WriteAllText(_key, _rsa.ExportPkcs8PrivateKeyPem());
        if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(_key, UnixFileMode.UserRead|UnixFileMode.UserWrite);
    }
    private Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Program> Configured() => _factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_,config) => config.AddInMemoryCollection(new Dictionary<string,string?>
    {
        ["Playback:Enabled"]="true",["Playback:Issuer"]="test-issuer",["Playback:Audience"]="test-media",["Playback:KeyId"]="test-key",
        ["Playback:SigningKeyPath"]=_key,["Playback:GatewayUrl"]="https://media.example.test",["CloudflareR2:PublicUrl"]="https://media.example.test"
    })));
    private static async Task<int> Seed(IServiceProvider services)
    {
        using var scope=services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<NetFilmxDbContext>();
        var catalogue=services.GetRequiredService<PlaybackCatalogue>();var film=catalogue.Data.Films["sintel"];
        var video=new Video("Sintel","Fixture",0,"https://media.example.test/"+film.Master,"https://media.example.test/posters/sintel_poster.jpg");
        db.Videos.Add(video);await db.SaveChangesAsync();return video.Id;
    }
    [Theory]
    [InlineData("")]
    [InlineData("invalid")]
    [InlineData("mock-netfilmx-admin-login")]
    [InlineData("mock-wrong-host")]
    [InlineData("mock-expired")]
    [InlineData("timeout")]
    [InlineData("slow")]
    [InlineData("unavailable")]
    public async Task RejectedEvidenceNeverIssuesGrant(string token)
    {
        using var app=Configured();var id=await Seed(app.Services);
        using var client=app.CreateClient(new(){BaseAddress=new Uri("https://localhost")});
        var csrf=await client.GetFromJsonAsync<JsonElement>("/auth/csrf");
        using var request=new HttpRequestMessage(HttpMethod.Post,"/playback/grant"){Content=new FormUrlEncodedContent(new Dictionary<string,string>{{"videoId",id.ToString()},{"token",token}})};
        request.Headers.Add("X-CSRF-TOKEN",csrf.GetProperty("token").GetString());
        using var response=await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest,response.StatusCode);
        Assert.DoesNotContain("/g/",await response.Content.ReadAsStringAsync());
        Assert.True(response.Headers.CacheControl?.NoStore);
        Assert.Equal(string.IsNullOrWhiteSpace(token)?0:1,_factory.Siteverify.Calls);
    }
    [Fact]
    public async Task AnonymousGrantHasTenScopedTracks_NoSourceBeforeIntent_ReplayRejected()
    {
        using var app=Configured();var id=await Seed(app.Services);
        using var client=app.CreateClient(new(){BaseAddress=new Uri("https://localhost")});
        var html=await client.GetStringAsync("/home/watch/"+id);
        Assert.Contains("data-video-id=\""+id+"\"",html);
        Assert.DoesNotContain("/g/",html);Assert.DoesNotContain("src=\"https://media.example.test/videos/",html);
        Assert.DoesNotContain("Purchase Access",html);Assert.DoesNotContain("/auth/register",html);
        var csrf=await client.GetFromJsonAsync<JsonElement>("/auth/csrf");
        var token="mock-netfilmx-playback-"+Guid.NewGuid().ToString("N");
        async Task<HttpResponseMessage> Send(bool antiforgery=true)
        {
            using var request=new HttpRequestMessage(HttpMethod.Post,"/playback/grant"){Content=new FormUrlEncodedContent(new Dictionary<string,string>{{"videoId",id.ToString()},{"token",token}})};
            if(antiforgery)request.Headers.Add("X-CSRF-TOKEN",csrf.GetProperty("token").GetString());
            return await client.SendAsync(request);
        }
        using var blocked=await Send(false);Assert.Equal(HttpStatusCode.BadRequest,blocked.StatusCode);Assert.Equal(0,_factory.Siteverify.Calls);
        using var accepted=await Send();Assert.Equal(HttpStatusCode.OK,accepted.StatusCode);
        var access=await accepted.Content.ReadFromJsonAsync<PlaybackAccess>();Assert.NotNull(access);Assert.Equal(10,access.Subtitles.Length);
        var prefix=access.Url[..access.Url.IndexOf("videos/",StringComparison.Ordinal)];
        Assert.All(access.Subtitles,t=>Assert.StartsWith(prefix,t.Url));
        Assert.True(accepted.Headers.CacheControl?.NoStore);Assert.Equal("no-referrer",accepted.Headers.GetValues("Referrer-Policy").Single());
        using var replay=await Send();Assert.Equal(HttpStatusCode.BadRequest,replay.StatusCode);Assert.DoesNotContain("/g/",await replay.Content.ReadAsStringAsync());
    }
    [Fact]
    public async Task OrdinaryCredentialsCannotObtainAdminSession_ProvisioningNeverPromotesThem()
    {
        using var app=Configured();using var scope=app.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<NetFilmxDbContext>();
        var user=new User("ordinary","ordinary@example.test",new NetFilmx_Service.Security.Argon2idPasswordHasher().HashPassword("Password123!"));
        db.Users.Add(user);await db.SaveChangesAsync();
        using var client=app.CreateClient(new(){BaseAddress=new Uri("https://localhost"),AllowAutoRedirect=false});
        var page=await client.GetStringAsync("/auth/login");
        var tag=System.Text.RegularExpressions.Regex.Match(page,"<input[^>]*name=\"__RequestVerificationToken\"[^>]*>").Value;
        var csrf=WebUtility.HtmlDecode(System.Text.RegularExpressions.Regex.Match(tag,"value=\"([^\"]+)\"").Groups[1].Value);
        using var response=await client.PostAsync("/auth/login",new FormUrlEncodedContent(new Dictionary<string,string>{{"Username","ordinary"},{"Password","Password123!"},{"__RequestVerificationToken",csrf},{"cf-turnstile-response","mock-netfilmx-admin-login-"+Guid.NewGuid().ToString("N")}}));
        Assert.Equal(HttpStatusCode.OK,response.StatusCode);Assert.False(await db.UserSessions.AnyAsync());
        var supplied=new ConfigurationBuilder().AddConfiguration(app.Services.GetRequiredService<IConfiguration>()).AddInMemoryCollection(new Dictionary<string,string?>{["AdminProvisioning:Username"]="ordinary",["AdminProvisioning:Email"]="ordinary@example.test"}).Build();
        Assert.Equal(1,await NetFilmx_Web.AdminCommand.RunAsync(["create","--confirm-operator-access","--confirm-create-admin"],supplied,new StringReader("AnotherPassword123!")));
        await db.Entry(user).ReloadAsync();Assert.Equal(UserRole.User,user.Role);Assert.Single(await db.Users.ToArrayAsync());
    }
    [Fact]
    public async Task GrantRateLimitAndOversizedEvidenceStopBeforeSiteverify()
    {
        using var app=Configured().WithWebHostBuilder(builder=>builder.ConfigureAppConfiguration((_,config)=>config.AddInMemoryCollection(new Dictionary<string,string?>{["RateLimits:PlaybackGrant"]="2"})));
        var id=await Seed(app.Services);
        using var client=app.CreateClient(new(){BaseAddress=new Uri("https://localhost")});
        var csrf=await client.GetFromJsonAsync<JsonElement>("/auth/csrf");
        async Task<HttpResponseMessage> Post(string token)
        {
            using var request=new HttpRequestMessage(HttpMethod.Post,"/playback/grant"){Content=new FormUrlEncodedContent(new Dictionary<string,string>{{"videoId",id.ToString()},{"token",token}})};
            request.Headers.Add("X-CSRF-TOKEN",csrf.GetProperty("token").GetString());
            return await client.SendAsync(request);
        }
        using var oversized=await Post(new string('x',3000));
        Assert.Equal(HttpStatusCode.BadRequest,oversized.StatusCode);Assert.Equal(0,_factory.Siteverify.Calls);
        using var rejected=await Post("invalid");Assert.Equal(HttpStatusCode.BadRequest,rejected.StatusCode);Assert.Equal(1,_factory.Siteverify.Calls);
        using var limited=await Post("invalid");Assert.Equal(HttpStatusCode.TooManyRequests,limited.StatusCode);Assert.Equal(1,_factory.Siteverify.Calls);
    }
    [Fact]
    public async Task DisabledPlaybackDoesNotCallProvider_AndOrdinaryHistoricalRefreshIsDenied()
    {
        using var client=_factory.CreateClient(new(){BaseAddress=new Uri("https://localhost")});
        var csrf=await client.GetFromJsonAsync<JsonElement>("/auth/csrf");
        using(var request=new HttpRequestMessage(HttpMethod.Post,"/playback/grant"){Content=new FormUrlEncodedContent(new Dictionary<string,string>{{"videoId","1"},{"token","mock-netfilmx-playback"}})})
        {
            request.Headers.Add("X-CSRF-TOKEN",csrf.GetProperty("token").GetString());
            using var denied=await client.SendAsync(request);Assert.Equal(HttpStatusCode.ServiceUnavailable,denied.StatusCode);
            Assert.Equal(0,_factory.Siteverify.Calls);
        }
        using var scope=_factory.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<NetFilmxDbContext>();
        var user=new User("historical","historical@example.test","retained-password-hash"){Balance=42};
        db.Users.Add(user);await db.SaveChangesAsync();
        var sessions=scope.ServiceProvider.GetRequiredService<NetFilmx_Service.Security.ISessionService>();
        var (raw,session)=await sessions.CreateSessionAsync(user.Id,false);
        using var browser=new AuthBrowser(_factory);browser.SetCookie("refresh_token",raw);
        using var refreshed=await browser.SendAsync(HttpMethod.Post,"/auth/refresh",csrf:await browser.CsrfAsync());
        Assert.Equal(HttpStatusCode.Unauthorized,refreshed.StatusCode);Assert.Empty(browser.Cookie("access_token"));
        db.ChangeTracker.Clear();var retained=await db.Users.SingleAsync(u=>u.Id==user.Id);
        Assert.Equal(42,retained.Balance);Assert.Equal("retained-password-hash",retained.PasswordHash);Assert.Equal(UserRole.User,retained.Role);
        Assert.True(await db.UserSessions.AnyAsync(s=>s.Id==session.Id));
    }
    public void Dispose(){_factory.Dispose();_rsa.Dispose();File.Delete(_key);}
}
