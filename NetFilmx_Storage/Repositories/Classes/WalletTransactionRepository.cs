using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;

namespace NetFilmx_Storage.Repositories
{
    public class WalletTransactionRepository : IWalletTransactionRepository
    {
        private readonly NetFilmxDbContext _context;

        public WalletTransactionRepository(NetFilmxDbContext context)
        {
            _context = context;
        }

        public async Task<List<WalletTransaction>> GetByUserIdAsync(int userId)
        {
            return await _context.WalletTransactions
                .Where(wt => wt.UserId == userId)
                .OrderByDescending(wt => wt.CreatedAt)
                .ToListAsync();
        }

        public async Task AddTransactionAsync(WalletTransaction transaction)
        {
            await _context.WalletTransactions.AddAsync(transaction);
            await _context.SaveChangesAsync();
        }
    }
}
