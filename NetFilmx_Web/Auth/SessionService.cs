using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using NetFilmx_Storage.Entities;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Web.Auth
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
            var tokenBytes = new byte[64];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(tokenBytes);
            }
            var refreshToken = Convert.ToBase64String(tokenBytes);
            var tokenHash = HashToken(refreshToken);

            var ttlDaysStr = rememberMe ? _configuration["JwtSettings:RefreshTokenTtlDaysRemember"] : _configuration["JwtSettings:RefreshTokenTtlDays"];
            int ttlDays = int.TryParse(ttlDaysStr, out var parsedTtl) ? parsedTtl : (rememberMe ? 30 : 7);

            var session = new UserSession(userId, tokenHash, DateTime.UtcNow.AddDays(ttlDays), ipAddress, userAgent);

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

            session.IsRevoked = true;
            await _sessionRepository.UpdateSessionAsync(session);

            return await CreateSessionAsync(session.UserId, false, session.IpAddress, session.UserAgent);
        }

        public async Task RevokeSessionAsync(string refreshTokenHash)
        {
            var session = await _sessionRepository.GetByRefreshTokenHashAsync(refreshTokenHash);
            if (session != null)
            {
                session.IsRevoked = true;
                await _sessionRepository.UpdateSessionAsync(session);
            }
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
