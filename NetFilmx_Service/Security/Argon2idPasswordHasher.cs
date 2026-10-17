using System.Security.Cryptography;
using System.Text;
using Konscious.Security.Cryptography;

namespace NetFilmx_Service.Security
{
    public class Argon2idPasswordHasher : IPasswordHasher
    {
        // Parameters for Argon2id. Adjust according to security requirements.
        private const int DegreeOfParallelism = 8;
        private const int Iterations = 4;
        private const int MemorySize = 1024 * 128; // 128 MB

        public string HashPassword(string password)
        {
            var salt = CreateSalt();
            var hash = HashPassword(password, salt);

            // Format: $argon2id$v=19$m=131072,t=4,p=8$salt$hash
            return $"$argon2id$v=19$m={MemorySize},t={Iterations},p={DegreeOfParallelism}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
        }

        public bool VerifyPassword(string password, string hash)
        {
            try
            {
                var parts = hash.Split('$');
                if (parts.Length != 6 || parts[1] != "argon2id")
                {
                    return false;
                }

                var salt = Convert.FromBase64String(parts[4]);
                var hashBytes = Convert.FromBase64String(parts[5]);

                var newHash = HashPassword(password, salt);

                return CryptographicOperations.FixedTimeEquals(newHash, hashBytes);
            }
            catch
            {
                return false;
            }
        }

        public bool NeedsRehash(string hash)
        {
            try
            {
                var parts = hash.Split('$');
                if (parts.Length != 6) return true;

                var parameters = parts[3];
                var expectedParameters = $"m={MemorySize},t={Iterations},p={DegreeOfParallelism}";

                return parameters != expectedParameters;
            }
            catch
            {
                return true;
            }
        }

        private byte[] CreateSalt()
        {
            var buffer = new byte[16];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(buffer);
            return buffer;
        }

        private byte[] HashPassword(string password, byte[] salt)
        {
            using var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password))
            {
                Salt = salt,
                DegreeOfParallelism = DegreeOfParallelism,
                Iterations = Iterations,
                MemorySize = MemorySize
            };

            return argon2.GetBytes(32);
        }
    }
}
