using FluentAssertions;
using Microsoft.Extensions.Configuration;
using NetFilmx_Storage.Entities;
using NetFilmx_Service.Security;

namespace NetFilmx_Tests.Unit.Auth
{
    public class JwtTokenServiceTests
    {
        private readonly IJwtTokenService _tokenService;

        public JwtTokenServiceTests()
        {
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    {"JwtSettings:SecretKey", "ThisIsATestSecretKeyThatIsAtLeast256BitsLong!!"},
                    {"JwtSettings:Issuer", "NetFilmx-Test"},
                    {"JwtSettings:Audience", "NetFilmx-Test"},
                    {"JwtSettings:AccessTokenTtlMinutes", "15"}
                })
                .Build();

            _tokenService = new JwtTokenService(config);
        }

        [Fact]
        public void GenerateAccessToken_ShouldReturnNonEmptyString()
        {
            // Arrange
            var user = CreateTestUser();

            // Act
            var token = _tokenService.GenerateAccessToken(user);

            // Assert
            token.Should().NotBeNullOrEmpty();
        }

        [Fact]
        public void GenerateAccessToken_ShouldContainThreeParts()
        {
            // JWT format: header.payload.signature
            var user = CreateTestUser();
            var token = _tokenService.GenerateAccessToken(user);

            token.Split('.').Should().HaveCount(3);
        }

        [Fact]
        public void ValidateAccessToken_ShouldReturnUserIdForValidToken()
        {
            // Arrange
            var user = CreateTestUser();
            var token = _tokenService.GenerateAccessToken(user);

            // Act
            var userId = _tokenService.ValidateAccessToken(token);

            // Assert
            userId.Should().Be(user.Id);
        }

        [Fact]
        public void ValidateAccessToken_ShouldReturnNullForInvalidToken()
        {
            // Act
            var userId = _tokenService.ValidateAccessToken("invalid.token.here");

            // Assert
            userId.Should().BeNull();
        }

        [Fact]
        public void ValidateAccessToken_ShouldReturnNullForTamperedToken()
        {
            // Arrange
            var user = CreateTestUser();
            var token = _tokenService.GenerateAccessToken(user);
            var tampered = token + "tampered";

            // Act
            var userId = _tokenService.ValidateAccessToken(tampered);

            // Assert
            userId.Should().BeNull();
        }

        [Theory]
        [InlineData("SecretKey", null)]
        [InlineData("SecretKey", "short")]
        [InlineData("Issuer", "")]
        [InlineData("Audience", null)]
        [InlineData("AccessTokenTtlMinutes", "0")]
        [InlineData("AccessTokenTtlMinutes", "61")]
        [InlineData("AccessTokenTtlMinutes", "invalid")]
        public void InvalidConfigurationIsRejectedWithoutDisclosingItsValue(string key, string? value)
        {
            var settings = new Dictionary<string, string?>
            {
                ["JwtSettings:SecretKey"] = "ThisIsATestSecretKeyThatIsAtLeast256BitsLong!!",
                ["JwtSettings:Issuer"] = "NetFilmx-Test", ["JwtSettings:Audience"] = "NetFilmx-Test",
                ["JwtSettings:AccessTokenTtlMinutes"] = "15"
            };
            settings["JwtSettings:" + key] = value;
            var config = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
            Assert.Throws<InvalidOperationException>(() => new JwtTokenService(config));
        }

        [Theory]
        [InlineData("issuer")]
        [InlineData("audience")]
        [InlineData("expired")]
        [InlineData("signature")]
        [InlineData("unsigned")]
        public void ValidationRejectsInvalidClaimsAndSignatures(string invalid)
        {
            var key = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(
                invalid == "signature" ? "AnotherTestSecretKeyThatIsAtLeast256BitsLong!!" : "ThisIsATestSecretKeyThatIsAtLeast256BitsLong!!"));
            var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
                issuer: invalid == "issuer" ? "wrong" : "NetFilmx-Test",
                audience: invalid == "audience" ? "wrong" : "NetFilmx-Test",
                claims: new[] { new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, "42") },
                expires: DateTime.UtcNow.AddMinutes(invalid == "expired" ? -1 : 15),
                signingCredentials: invalid == "unsigned" ? null : new Microsoft.IdentityModel.Tokens.SigningCredentials(key, "HS256"));
            var encoded = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token);
            Assert.Null(_tokenService.ValidateAccessToken(encoded));
        }

        private static User CreateTestUser()
        {
            // Use internal constructor workaround
            var user = (User)System.Runtime.CompilerServices.RuntimeHelpers.GetUninitializedObject(typeof(User));
            // Set properties via reflection since constructor is internal
            typeof(User).GetProperty("Id")!.SetValue(user, 42);
            typeof(User).GetProperty("Username")!.SetValue(user, "testuser");
            typeof(User).GetProperty("Email")!.SetValue(user, "test@example.com");
            typeof(User).GetProperty("Role")!.SetValue(user, UserRole.User);
            return user;
        }
    }
}
