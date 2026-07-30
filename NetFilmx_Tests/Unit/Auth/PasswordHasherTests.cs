using FluentAssertions;
using NetFilmx_Web.Auth;

namespace NetFilmx_Tests.Unit.Auth
{
    public class PasswordHasherTests
    {
        private readonly IPasswordHasher _hasher;

        public PasswordHasherTests()
        {
            _hasher = new PasswordHasher();
        }

        [Fact]
        public void HashPassword_ShouldReturnPhcFormattedString()
        {
            // Act
            var hash = _hasher.HashPassword("TestPassword123!");

            // Assert
            hash.Should().StartWith("$argon2id$v=19$");
            hash.Should().Contain("m=19456,t=2,p=1");
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
        public void VerifyPassword_ShouldHandleLegacyBCryptHash()
        {
            // Arrange — simulate a BCrypt hash from the old system
            var password = "LegacyPassword123";
            var bcryptHash = BCrypt.Net.BCrypt.HashPassword(password);

            // Act & Assert — should still verify BCrypt hashes
            _hasher.VerifyPassword(password, bcryptHash).Should().BeTrue();
        }

        [Fact]
        public void NeedsRehash_ShouldReturnTrueForBCryptHash()
        {
            // Arrange
            var bcryptHash = BCrypt.Net.BCrypt.HashPassword("test");

            // Act & Assert
            _hasher.NeedsRehash(bcryptHash).Should().BeTrue();
        }

        [Fact]
        public void NeedsRehash_ShouldReturnFalseForArgon2idHash()
        {
            // Arrange
            var argon2Hash = _hasher.HashPassword("test");

            // Act & Assert
            _hasher.NeedsRehash(argon2Hash).Should().BeFalse();
        }
    }
}
