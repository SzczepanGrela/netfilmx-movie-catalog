using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using NetFilmx_Tests.Integration.Fixtures;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Xunit;

namespace NetFilmx_Tests.Integration
{
    public class AuthFlowTests : IClassFixture<TestWebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;

        public AuthFlowTests(TestWebApplicationFactory<Program> factory)
        {
            _client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });
        }

        [Fact(Skip = "Converted to MVC Views with Anti-Forgery tokens. Use E2E UI testing instead.")]
        public async Task CompleteAuthFlow_ShouldSucceed()
        {
            // 1. Register
            var registerResponse = await _client.PostAsJsonAsync("/auth/register", new
            {
                Username = "integrationtest",
                Email = "test@example.com",
                Password = "Password123!"
            });

            var content = await registerResponse.Content.ReadAsStringAsync();
            registerResponse.StatusCode.Should().Be(HttpStatusCode.OK, "Response: " + content);
            
            // Extract cookies
            var setCookieHeader = registerResponse.Headers.GetValues("Set-Cookie").ToList();
            setCookieHeader.Should().Contain(c => c.StartsWith("access_token="));
            setCookieHeader.Should().Contain(c => c.StartsWith("refresh_token="));

            var cookies = string.Join("; ", setCookieHeader.Select(c => c.Split(';')[0]));

            // 2. Get Me (authenticated)
            var request = new HttpRequestMessage(HttpMethod.Get, "/auth/me");
            request.Headers.Add("Cookie", cookies);
            var meResponse = await _client.SendAsync(request);
            meResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // 3. Refresh
            var refreshRequest = new HttpRequestMessage(HttpMethod.Post, "/auth/refresh");
            refreshRequest.Headers.Add("Cookie", cookies);
            var refreshResponse = await _client.SendAsync(refreshRequest);
            refreshResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var newSetCookieHeader = refreshResponse.Headers.GetValues("Set-Cookie").ToList();
            var newCookies = string.Join("; ", newSetCookieHeader.Select(c => c.Split(';')[0]));

            // 4. Logout
            var logoutRequest = new HttpRequestMessage(HttpMethod.Post, "/auth/logout");
            logoutRequest.Headers.Add("Cookie", newCookies);
            var logoutResponse = await _client.SendAsync(logoutRequest);
            logoutResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // 5. Check that cookies are deleted
            var logoutCookies = logoutResponse.Headers.GetValues("Set-Cookie").ToList();
            logoutCookies.Should().Contain(c => c.StartsWith("access_token=") && c.ToLower().Contains("expires="));

            var finalRequest = new HttpRequestMessage(HttpMethod.Get, "/auth/me");
            // not adding cookie headers simulating browser deleting them
            var finalResponse = await _client.SendAsync(finalRequest);
            finalResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
