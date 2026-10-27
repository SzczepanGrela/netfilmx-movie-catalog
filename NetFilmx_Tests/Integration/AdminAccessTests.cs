using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;
using NetFilmx_Service.Security;
using NetFilmx_Tests.Integration.Fixtures;

namespace NetFilmx_Tests.Integration;

public class AdminAccessTests : IClassFixture<TestWebApplicationFactory<Program>>
{
    private readonly TestWebApplicationFactory<Program> _factory;
    public AdminAccessTests(TestWebApplicationFactory<Program> factory) => _factory = factory;

    [Theory]
    [InlineData("/admin/video")]
    [InlineData("/admin/category")]
    [InlineData("/admin/series")]
    public async Task AnonymousUsersAreDirectedToLogin(string endpoint)
    {
        using var browser = new AuthBrowser(_factory);
        using var response = await browser.SendAsync(HttpMethod.Get, endpoint);
        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.StartsWith("/auth/login?returnUrl=", response.Headers.Location?.OriginalString);
    }

    [Fact]
    public async Task OrdinaryUsersCannotReadOrModifyAdminResources()
    {
        using var browser = new AuthBrowser(_factory);
        int ordinaryId;
        using (var seedScope = _factory.Services.CreateScope())
        {
            var db = seedScope.ServiceProvider.GetRequiredService<NetFilmxDbContext>();
            var user = new User("ordinary"+Guid.NewGuid().ToString("N"), "ordinary@example.test", "unused");
            db.Users.Add(user); await db.SaveChangesAsync(); ordinaryId=user.Id;
            browser.SetCookie("access_token", seedScope.ServiceProvider.GetRequiredService<IJwtTokenService>().GenerateAccessToken(user));
        }
        foreach (var url in new[] { "/admin/video", "/admin/category", "/admin/series", "/admin/user", "/admin/comment", "/admin/tag" })
        {
            using var response = await browser.SendAsync(HttpMethod.Get, url);
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
        using var write = await browser.SendAsync(HttpMethod.Post, "/admin/category/add", new() { ["Name"] = "forbidden" }, await browser.CsrfAsync());
        Assert.Equal(HttpStatusCode.Forbidden, write.StatusCode);
        using var promotion = await browser.SendAsync(HttpMethod.Post, "/admin/user/edit", new() { ["Id"]=ordinaryId.ToString(), ["Role"]="Admin" }, await browser.CsrfAsync());
        Assert.Equal(HttpStatusCode.Forbidden,promotion.StatusCode);
        using var scope = _factory.Services.CreateScope();
        Assert.Equal(UserRole.User,(await scope.ServiceProvider.GetRequiredService<NetFilmxDbContext>().Users.SingleAsync(u=>u.Id==ordinaryId)).Role);
        Assert.False(await scope.ServiceProvider.GetRequiredService<NetFilmxDbContext>().Categories.AnyAsync(c => c.Name == "forbidden"));
    }

    [Fact]
    public async Task WithdrawnAdminRoleRejectsPreviouslyIssuedAccessToken()
    {
        var name="withdrawn"+Guid.NewGuid().ToString("N");await _factory.CreateAdminAsync(name);
        using var browser=new AuthBrowser(_factory);using var login=await browser.LoginAsync(name);
        Assert.Equal(HttpStatusCode.Redirect,login.StatusCode);
        using(var scope=_factory.Services.CreateScope())
        {
            var db=scope.ServiceProvider.GetRequiredService<NetFilmxDbContext>();
            var user=await db.Users.SingleAsync(u=>u.Username==name);user.Role=UserRole.User;await db.SaveChangesAsync();
        }
        using var denied=await browser.SendAsync(HttpMethod.Get,"/admin/user");Assert.Equal(HttpStatusCode.Redirect,denied.StatusCode);
        using var refresh=await browser.SendAsync(HttpMethod.Post,"/auth/refresh",csrf:await browser.CsrfAsync());
        Assert.Equal(HttpStatusCode.Unauthorized,refresh.StatusCode);
    }

    [Fact]
    public async Task AdministratorCanUseForms_ButCannotWriteWithoutCsrf()
    {
        var name = "admin" + Guid.NewGuid().ToString("N");
        await _factory.CreateAdminAsync(name);
        using var browser = new AuthBrowser(_factory);
        using var login = await browser.LoginAsync(name);
        Assert.Equal(HttpStatusCode.Redirect, login.StatusCode);
        var categoryName = "Category" + Guid.NewGuid().ToString("N");
        var form = new Dictionary<string, string> { ["Name"] = categoryName, ["Description"] = "CSRF test" };
        using var blocked = await browser.SendAsync(HttpMethod.Post, "/admin/category/add", form);
        Assert.Equal(HttpStatusCode.BadRequest, blocked.StatusCode);
        using var badToken = await browser.SendAsync(HttpMethod.Post, "/admin/category/add", form, "invalid");
        Assert.Equal(HttpStatusCode.BadRequest, badToken.StatusCode);
        form["__RequestVerificationToken"] = await browser.FormTokenAsync("/admin/category/add");
        using var added = await browser.SendAsync(HttpMethod.Post, "/admin/category/add", form);
        Assert.Equal(HttpStatusCode.Redirect, added.StatusCode);
        using var read = _factory.Services.CreateScope();
        var dbRead = read.ServiceProvider.GetRequiredService<NetFilmxDbContext>();
        Assert.Equal(1, await dbRead.Categories.CountAsync(c => c.Name == categoryName));
    }
}
