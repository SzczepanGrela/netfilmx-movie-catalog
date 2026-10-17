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
            return await _context.UserSessions.AsNoTracking()
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

        public async Task<bool> TryRotateSessionAsync(int currentId, UserSession replacement, DateTime now)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();
            var consumed = await _context.UserSessions
                .Where(s => s.Id == currentId && s.UserId == replacement.UserId && !s.IsRevoked && s.ExpiresAt > now)
                .ExecuteUpdateAsync(u => u.SetProperty(s => s.IsRevoked, true));
            if (consumed != 1) return false;

            _context.UserSessions.Add(replacement);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        }

        public async Task RevokeByRefreshTokenHashAsync(string refreshTokenHash)
        {
            await _context.UserSessions.Where(s => s.RefreshTokenHash == refreshTokenHash && !s.IsRevoked)
                .ExecuteUpdateAsync(u => u.SetProperty(s => s.IsRevoked, true));
        }

        public async Task RevokeAllUserSessionsAsync(int userId)
        {
            await _context.UserSessions.Where(s => s.UserId == userId && !s.IsRevoked)
                .ExecuteUpdateAsync(u => u.SetProperty(s => s.IsRevoked, true));
        }
    }
}
