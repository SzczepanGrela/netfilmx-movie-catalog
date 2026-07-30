using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;

namespace NetFilmx_Storage.Repositories
{
    public class UserSessionRepository : IUserSessionRepository
    {
        private readonly NetFilmxDbContext _context;

        public UserSessionRepository(NetFilmxDbContext context)
        {
            _context = context;
        }

        public async Task<UserSession?> GetByRefreshTokenHashAsync(string refreshTokenHash)
        {
            return await _context.UserSessions
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.RefreshTokenHash == refreshTokenHash && !s.IsRevoked && s.ExpiresAt > DateTime.UtcNow);
        }

        public async Task<List<UserSession>> GetActiveSessionsByUserIdAsync(int userId)
        {
            return await _context.UserSessions
                .Where(s => s.UserId == userId && !s.IsRevoked && s.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync();
        }

        public async Task AddSessionAsync(UserSession session)
        {
            await _context.UserSessions.AddAsync(session);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateSessionAsync(UserSession session)
        {
            _context.UserSessions.Update(session);
            await _context.SaveChangesAsync();
        }

        public async Task RevokeAllUserSessionsAsync(int userId)
        {
            var sessions = await _context.UserSessions
                .Where(s => s.UserId == userId && !s.IsRevoked)
                .ToListAsync();

            foreach (var session in sessions)
            {
                session.IsRevoked = true;
            }

            await _context.SaveChangesAsync();
        }
    }
}
