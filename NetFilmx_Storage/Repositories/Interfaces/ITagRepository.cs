using NetFilmx_Storage.Entities;

namespace NetFilmx_Storage.Repositories
{
    public interface ITagRepository
    {
        Task<List<Tag>> GetAllTagsAsync();
        Task<(IEnumerable<Tag>, int totalCount)> GetPagedTagsAsync(int pageNumber, int pageSize, string searchTerm);
        Task<List<Tag>> GetTagsByVideoIdAsync(int videoId);

        Task<List<Tag>> GetTagsByExcludedVideoIdAsync(int videoId);

        Task<Tag> GetTagByIdAsync(int tagId);
        Task<Tag> GetTagByNameAsync(string tagName);

        Task AddTagAsync(Tag tag);
        Task UpdateTagAsync(Tag tag);
        Task DeleteTagAsync(int tagId);

        Task<bool> IsTagExistAsync(int tagId);
        Task<bool> IsTagExistAsync(string tagName);

        Task<int> GetVideosCountByTagIdAsync(int tagId);
        Task<int> GetVideosCountByTagNameAsync(string tagName);
    }
}
