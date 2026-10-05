using NetFilmx_Storage.Entities;

namespace NetFilmx_Service.Security
{
    public interface ISessionService
    {
        Task<(string refreshToken, UserSession session)> CreateSessionAsync(int userId, bool rememberMe = false, string? ipAddress = null, string? userAgent = null);
        Task<(string newRefreshToken, UserSession newSession)?> RotateSessionAsync(string refreshToken);
        Task RevokeSessionAsync(string refreshToken);
        Task RevokeAllUserSessionsAsync(int userId);
        string HashToken(string token);
    }
}
