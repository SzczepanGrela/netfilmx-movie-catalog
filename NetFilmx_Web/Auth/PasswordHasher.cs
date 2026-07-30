using System.Security.Cryptography;
using Konscious.Security.Cryptography;
using System.Text;

namespace NetFilmx_Web.Auth
{
    public class PasswordHasher : IPasswordHasher
    {
        private const int MemorySize = 19456;
        private const int Iterations = 2;
        private const int Parallelism = 1;
        private const int SaltSize = 16;
        private const int HashSize = 32;

        public string HashPassword(string password)
        {
            byte[] salt = new byte[SaltSize];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(salt);
            }

            using (var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password)))
            {
                argon2.Salt = salt;
                argon2.DegreeOfParallelism = Parallelism;
                argon2.Iterations = Iterations;
                argon2.MemorySize = MemorySize;

                var hash = argon2.GetBytes(HashSize);

                return $"$argon2id$v=19$m={MemorySize},t={Iterations},p={Parallelism}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
            }
        }

        public bool VerifyPassword(string password, string hash)
        {
            if (hash.StartsWith("$2"))
            {
                return BCrypt.Net.BCrypt.Verify(password, hash);
            }

            if (!hash.StartsWith("$argon2id$v=19$"))
            {
                return false;
            }

            var parts = hash.Split('$');
            if (parts.Length != 6) return false;

            var salt = Convert.FromBase64String(parts[4]);
            var expectedHash = Convert.FromBase64String(parts[5]);

            using (var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password)))
            {
                argon2.Salt = salt;
                argon2.DegreeOfParallelism = Parallelism;
                argon2.Iterations = Iterations;
                argon2.MemorySize = MemorySize;

                var actualHash = argon2.GetBytes(HashSize);

                return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
            }
        }

        public bool NeedsRehash(string hash)
        {
            return hash.StartsWith("$2");
        }
    }
}
