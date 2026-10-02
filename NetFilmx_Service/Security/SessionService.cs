using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using NetFilmx_Storage.Entities;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Security
{
    public class SessionService : ISessionService
    {
        private readonly IUserSessionRepository _sessionRepository;
        private readonly IConfiguration _configuration;

        public SessionService(IUserSessionRepository sessionRepository, IConfiguration configuration)
        {
            _sessionRepository = sessionRepository;
            _configuration = configuration;
        }

        public async Task<(string refreshToken, UserSession session)> CreateSessionAsync(int userId, bool rememberMe = false, string? ipAddress = null, string? userAgent = null)
        {
            var ttlDaysStr = rememberMe ? _configuration["JwtSettings:RefreshTokenTtlDaysRemember"] : _configuration["JwtSettings:RefreshTokenTtlDays"];
            int ttlDays = int.TryParse(ttlDaysStr, out var parsedTtl) ? parsedTtl : (rememberMe ? 30 : 7);

            var (refreshToken, session) = NewSession(userId, DateTime.UtcNow.AddDays(ttlDays), ipAddress, userAgent);

            await _sessionRepository.AddSessionAsync(session);

            return (refreshToken, session);
        }

        public async Task<(string newRefreshToken, UserSession newSession)?> RotateSessionAsync(string refreshToken)
        {
            var hash = HashToken(refreshToken);
            var session = await _sessionRepository.GetByRefreshTokenHashAsync(hash);

            if (session == null || session.IsRevoked || session.ExpiresAt <= DateTime.UtcNow)
            {
                return null;
            }

            // Preserve the original absolute expiry, including remembered logins.
            var (newToken, replacement) = NewSession(session.UserId, session.ExpiresAt, session.IpAddress, session.UserAgent);
            if (!await _sessionRepository.TryRotateSessionAsync(session.Id, replacement, DateTime.UtcNow))
                return null;
            return (newToken, replacement);
        }

        public Task RevokeSessionAsync(string refreshToken) =>
            _sessionRepository.RevokeByRefreshTokenHashAsync(HashToken(refreshToken));

        private (string token, UserSession session) NewSession(int userId, DateTime expiresAt, string? ipAddress, string? userAgent)
        {
            var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
            return (token, new UserSession(userId, HashToken(token), expiresAt, ipAddress, userAgent));
        }

        public async Task RevokeAllUserSessionsAsync(int userId)
        {
            await _sessionRepository.RevokeAllUserSessionsAsync(userId);
        }

        public string HashToken(string token)
        {
            using (var sha256 = SHA256.Create())
            {
                var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
                return Convert.ToHexString(hashBytes).ToLowerInvariant();
            }
        }
    }
}
