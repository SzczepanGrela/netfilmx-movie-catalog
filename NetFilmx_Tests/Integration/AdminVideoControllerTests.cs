using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using NetFilmx_Tests.Integration.Fixtures;
using System.Net;
using System.Threading.Tasks;
using Xunit;

namespace NetFilmx_Tests.Integration
{
    public class AdminVideoControllerTests : IClassFixture<TestWebApplicationFactory<Program>>
    {
        private readonly TestWebApplicationFactory<Program> _factory;

        public AdminVideoControllerTests(TestWebApplicationFactory<Program> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task Get_AdminVideoIndex_WhenNotAuthenticated_ShouldRedirectToLogin()
        {
            // Arrange
            var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            // Act
            var response = await client.GetAsync("/Admin/Video/Index");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Redirect);
            response.Headers.Location.Should().NotBeNull();
            response.Headers.Location.ToString().ToLower().Should().Contain("login");
        }
    }
}
