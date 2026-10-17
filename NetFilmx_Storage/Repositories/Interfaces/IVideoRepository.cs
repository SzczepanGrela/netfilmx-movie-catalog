using NetFilmx_Storage.Entities;

namespace NetFilmx_Storage.Repositories
{
    public interface IVideoRepository
    {
        Task<List<Video>> GetAllVideosAsync();
        Task<(IEnumerable<Video>, int totalCount)> GetPagedVideosAsync(int pageNumber, int pageSize, string searchTerm);
        Task<List<Video>> GetVideosByCategoryIdAsync(int categoryId);
        Task<List<Video>> GetVideosBySeriesIdAsync(int seriesId);
        Task<List<Video>> GetVideosByTagIdAsync(int tagId);
        Task<List<Video>> GetVideosByUserIdAsync(int userId);

        Task<List<Video>> GetVideosByExcludedCategoryIdAsync(int categoryId);
        Task<List<Video>> GetVideosByExcludedSeriesIdAsync(int seriesId);
        Task<List<Video>> GetVideosByExcludedTagIdAsync(int tagId);
        Task<List<Video>> GetVideosByExcludedUserIdAsync(int userId);

        Task<Video> GetVideoByIdAsync(int videoId);
        Task<Video> GetVideoByVideoPurchaseIdAsync(int videoPurchaseId);
        Task<Video> GetVideoByCommentIdAsync(int commentId);
        Task<Video> GetVideoByLikeIdAsync(int likeId);

        Task AddVideoToTagAsync(int tagId, int videoId);
        Task RemoveVideoFromTagAsync(int tagId, int videoId);
        Task AddVideoToSeriesAsync(int seriesId, int videoId);
        Task RemoveVideoFromSeriesAsync(int seriesId, int videoId);
        Task AddVideoToCategoryAsync(int categoryId, int videoId);
        Task RemoveVideoFromCategoryAsync(int categoryId, int videoId);

        Task AddVideoAsync(Video video);
        Task UpdateVideoAsync(Video video);
        Task DeleteVideoAsync(int videoId);

        Task<bool> IsVideoExistInTagAsync(int tagId, int videoId);
        Task<bool> IsVideoExistInSeriesAsync(int seriesId, int videoId);
        Task<bool> IsVideoExistInCategoryAsync(int categoryId, int videoId);
        Task<bool> IsVideoExistAsync(int videoId);

    }
}
