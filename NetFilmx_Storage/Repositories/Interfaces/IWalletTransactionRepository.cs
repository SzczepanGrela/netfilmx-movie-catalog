using NetFilmx_Storage.Entities;

namespace NetFilmx_Storage.Repositories
{
    public interface IWalletTransactionRepository
    {
        Task<List<WalletTransaction>> GetByUserIdAsync(int userId);
        Task AddTransactionAsync(WalletTransaction transaction);
    }
}
