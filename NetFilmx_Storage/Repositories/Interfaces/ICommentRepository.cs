using NetFilmx_Storage.Entities;

namespace NetFilmx_Storage.Repositories
{
    public interface ICommentRepository
    {
        Task<List<Comment>> GetAllCommentsAsync();
        Task<(IEnumerable<Comment>, int totalCount)> GetPagedCommentsAsync(int pageNumber, int pageSize, string searchTerm);
        Task<List<Comment>> GetCommentsByVideoIdAsync(int videoId);
        Task<List<Comment>> GetCommentsByUserIdAsync(int userId);
        Task<Comment> GetCommentByIdAsync(int commentId);
        Task AddCommentAsync(Comment comment);
        Task UpdateCommentAsync(Comment comment);
        Task DeleteCommentAsync(int commentId);

        Task<bool> IsCommentExistAsync(int commentId);
    }
}
