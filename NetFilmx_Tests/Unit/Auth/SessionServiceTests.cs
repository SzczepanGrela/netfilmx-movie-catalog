using FluentAssertions;
using Moq;
using NetFilmx_Storage.Entities;
using NetFilmx_Storage.Repositories;
using NetFilmx_Web.Auth;
using Microsoft.Extensions.Configuration;

namespace NetFilmx_Tests.Unit.Auth
{
    public class SessionServiceTests
    {
        private readonly Mock<IUserSessionRepository> _sessionRepoMock;
        private readonly ISessionService _sessionService;

        public SessionServiceTests()
        {
            _sessionRepoMock = new Mock<IUserSessionRepository>();
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    {"JwtSettings:RefreshTokenTtlDays", "7"},
                    {"JwtSettings:RefreshTokenTtlDaysRemember", "30"}
                })
                .Build();

            _sessionService = new SessionService(_sessionRepoMock.Object, config);
        }

        [Fact]
        public async Task CreateSession_ShouldReturnRefreshTokenAndSession()
        {
            // Act
            var (refreshToken, session) = await _sessionService.CreateSessionAsync(1);

            // Assert
            refreshToken.Should().NotBeNullOrEmpty();
            session.Should().NotBeNull();
            session.UserId.Should().Be(1);
            session.IsRevoked.Should().BeFalse();
            session.RefreshTokenHash.Should().NotBe(refreshToken, "hash should differ from raw token");
        }

        [Fact]
        public async Task CreateSession_ShouldStoreHashedToken()
        {
            // Act
            var (refreshToken, session) = await _sessionService.CreateSessionAsync(1);

            // Assert — verify that the repo received a hashed token, not plaintext
            _sessionRepoMock.Verify(r => r.AddSessionAsync(
                It.Is<UserSession>(s => s.RefreshTokenHash != refreshToken && s.RefreshTokenHash.Length > 0)
            ), Times.Once);
        }

        [Fact]
        public async Task CreateSession_RememberMe_ShouldHaveLongerExpiry()
        {
            // Act
            var (_, sessionShort) = await _sessionService.CreateSessionAsync(1, rememberMe: false);
            var (_, sessionLong) = await _sessionService.CreateSessionAsync(1, rememberMe: true);

            // Assert
            sessionLong.ExpiresAt.Should().BeAfter(sessionShort.ExpiresAt);
        }

        [Fact]
        public async Task RotateSession_ShouldRevokeOldAndCreateNew()
        {
            // Arrange
            var (originalToken, originalSession) = await _sessionService.CreateSessionAsync(1);
            var originalHash = _sessionService.HashToken(originalToken);

            _sessionRepoMock.Setup(r => r.GetByRefreshTokenHashAsync(originalHash))
                .ReturnsAsync(originalSession);

            // Act
            var result = await _sessionService.RotateSessionAsync(originalToken);

            // Assert
            result.Should().NotBeNull();
            var (newToken, newSession) = result!.Value;
            newToken.Should().NotBe(originalToken);
            originalSession.IsRevoked.Should().BeTrue("old session should be revoked");
        }

        [Fact]
        public async Task RotateSession_InvalidToken_ShouldReturnNull()
        {
            // Arrange
            _sessionRepoMock.Setup(r => r.GetByRefreshTokenHashAsync(It.IsAny<string>()))
                .ReturnsAsync((UserSession?)null);

            // Act
            var result = await _sessionService.RotateSessionAsync("invalid-token");

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public void HashToken_ShouldProduceConsistentHash()
        {
            // Arrange
            var token = "test-token-value";

            // Act
            var hash1 = _sessionService.HashToken(token);
            var hash2 = _sessionService.HashToken(token);

            // Assert
            hash1.Should().Be(hash2);
            hash1.Should().NotBe(token);
        }
    }
}
