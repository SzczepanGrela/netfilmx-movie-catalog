using NetFilmx_Storage.Entities;

namespace NetFilmx_Storage.Repositories
{
    public interface IUserRepository
    {
        Task<List<User>> GetAllUsersAsync();
        Task<(IEnumerable<User>, int totalCount)> GetPagedUsersAsync(int pageNumber, int pageSize, string searchTerm);
        Task<List<User>> GetUsersByVideoIdAsync(int videoId);
        Task<List<User>> GetUsersBySeriesIdAsync(int seriesId);

        Task<List<User>> GetUsersByExcludedSeriesIdAsync(int seriesId);
        Task<List<User>> GetUsersByExcludedVideoIdAsync(int videoId);


        Task<User> GetUserByUsernameAsync(string username);
        Task<User> GetUserByIdAsync(int userId);
        Task<User> GetUserByCommentIdAsync(int commentId);
        Task<User> GetUserByLikeIdAsync(int likeId);
        Task<User> GetUserByVideoPurchaseIdAsync(int videoPurchaseId);
        Task<User> GetUserBySeriesPurchaseIdAsync(int seriesPurchaseId);

        Task AddUserAsync(User user);
        Task UpdateUserAsync(User user);
        Task DeleteUserAsync(int userId);

        Task<bool> IsUsernameAvailableAsync(string username);
        Task<bool> IsUserExistAsync(int userId);

        Task<bool> IsUsernameAvailableForUserAsync(string username, int uderId);
    }
}
