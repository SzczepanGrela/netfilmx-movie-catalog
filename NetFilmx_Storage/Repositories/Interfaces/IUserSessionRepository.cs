using NetFilmx_Storage.Entities;

namespace NetFilmx_Storage.Repositories
{
    public interface IUserSessionRepository
    {
        Task<UserSession?> GetByRefreshTokenHashAsync(string refreshTokenHash);
        Task<List<UserSession>> GetActiveSessionsByUserIdAsync(int userId);
        Task AddSessionAsync(UserSession session);
        Task UpdateSessionAsync(UserSession session);
        Task RevokeAllUserSessionsAsync(int userId);
    }
}
