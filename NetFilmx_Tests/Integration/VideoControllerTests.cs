using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using NetFilmx_Tests.Integration.Fixtures;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Xunit;

namespace NetFilmx_Tests.Integration
{
    public class VideoControllerTests : IClassFixture<TestWebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;

        public VideoControllerTests(TestWebApplicationFactory<Program> factory)
        {
            _client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });
        }

        [Fact]
        public async Task AddVideo_RequiresAuthentication()
        {
            // Arrange
            var content = new MultipartFormDataContent();
            content.Add(new StringContent("Test Title"), "Title");
            content.Add(new StringContent("Test Desc"), "Description");
            content.Add(new StringContent("10.50"), "Price");
            // Deliberately missing VideoFile, ThumbnailFile, and VideoUrl
            
            using var response = await _client.PostAsync("/admin/video/add", content);
            response.StatusCode.Should().Be(HttpStatusCode.Redirect);
            response.Headers.Location!.OriginalString.Should().StartWith("/auth/login?returnUrl=");
        }
    }
}
