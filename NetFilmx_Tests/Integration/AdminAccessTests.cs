using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using NetFilmx_Tests.Integration.Fixtures;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Xunit;

namespace NetFilmx_Tests.Integration
{
    public class AdminAccessTests : IClassFixture<TestWebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;

        public AdminAccessTests(TestWebApplicationFactory<Program> factory)
        {
            _client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });
        }

        [Theory]
        [InlineData("/admin/video")]
        [InlineData("/admin/category")]
        [InlineData("/admin/series")]
        public async Task AdminEndpoints_ShouldReturnUnauthorized_WhenNotAuthenticated(string endpoint)
        {
            var response = await _client.GetAsync(endpoint);
            
            // Should be 401 Unauthorized
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task AdminEndpoints_ShouldReturnForbidden_WhenAuthenticatedAsNormalUser()
        {
            // Register a normal user
            var registerResponse = await _client.PostAsJsonAsync("/auth/register", new
            {
                Username = "normaluser",
                Email = "normaluser@example.com",
                Password = "Password123!"
            });

            registerResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Extract cookies
            var setCookieHeader = registerResponse.Headers.GetValues("Set-Cookie").ToList();
            var cookies = string.Join("; ", setCookieHeader.Select(c => c.Split(';')[0]));

            // Try to access admin endpoint
            var request = new HttpRequestMessage(HttpMethod.Get, "/admin/video");
            request.Headers.Add("Cookie", cookies);
            var response = await _client.SendAsync(request);

            // Should be 403 Forbidden
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }
}
