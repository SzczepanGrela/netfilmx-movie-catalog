using FluentAssertions;
using NetFilmx_Service.Security;
using NetFilmx_Service.Security;

namespace NetFilmx_Tests.Unit.Auth
{
    public class PasswordHasherTests
    {
        private readonly IPasswordHasher _hasher;

        public PasswordHasherTests()
        {
            _hasher = new Argon2idPasswordHasher();
        }

        [Fact]
        public void HashPassword_ShouldReturnPhcFormattedString()
        {
            // Act
            var hash = _hasher.HashPassword("TestPassword123!");

            // Assert
            hash.Should().StartWith("$argon2id$v=19$");
            hash.Should().Contain("m=131072,t=4,p=8");
        }

        [Fact]
        public void HashPassword_ShouldProduceDifferentHashesForSamePassword()
        {
            // Act (different salts)
            var hash1 = _hasher.HashPassword("SamePassword");
            var hash2 = _hasher.HashPassword("SamePassword");

            // Assert
            hash1.Should().NotBe(hash2);
        }

        [Fact]
        public void VerifyPassword_ShouldReturnTrueForCorrectPassword()
        {
            // Arrange
            var password = "CorrectPassword123!";
            var hash = _hasher.HashPassword(password);

            // Act & Assert
            _hasher.VerifyPassword(password, hash).Should().BeTrue();
        }

        [Fact]
        public void VerifyPassword_ShouldReturnFalseForWrongPassword()
        {
            // Arrange
            var hash = _hasher.HashPassword("CorrectPassword");

            // Act & Assert
            _hasher.VerifyPassword("WrongPassword", hash).Should().BeFalse();
        }

        [Fact]
        public void NeedsRehash_ShouldReturnTrueForInvalidHash()
        {
            // Arrange
            var invalidHash = "$argon2id$v=19$m=1,t=1,p=1$salt$hash";

            // Act & Assert
            _hasher.NeedsRehash(invalidHash).Should().BeTrue();
        }

        [Fact]
        public void NeedsRehash_ShouldReturnFalseForValidHash()
        {
            // Arrange
            var argon2Hash = _hasher.HashPassword("test");

            // Act & Assert
            _hasher.NeedsRehash(argon2Hash).Should().BeFalse();
        }
    }
}
