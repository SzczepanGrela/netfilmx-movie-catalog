using NetFilmx_Storage.Entities;

namespace NetFilmx_Storage.Repositories
{
    public interface ISeriesRepository
    {
        Task<List<Series>> GetAllSeriesAsync();
        Task<(IEnumerable<Series>, int totalCount)> GetPagedSeriesAsync(int pageNumber, int pageSize, string searchTerm);
        Task<List<Series>> GetSeriesByVideoIdAsync(int videoId);
        Task<List<Series>> GetSeriesByUserIdAsync(int userId);
        Task<List<Series>> GetSeriesByExcludedVideoIdAsync(int videoId);
        Task<List<Series>> GetSeriesByExcludedUserIdAsync(int userId);



        Task<Series> GetSeriesByIdAsync(int seriesId);
        Task<Series> GetSeriesByNameAsync(string seriesName);

        Task AddSeriesAsync(Series series);
        Task UpdateSeriesAsync(Series series);
        Task DeleteSeriesAsync(int seriesId);

        Task<bool> IsSeriesExistAsync(string seriesName);
        Task<bool> IsSeriesExistAsync(int seriesId);

        Task<int> GetVideosCountBySeriesIdAsync(int seriesId);
        Task<int> GetVideosCountBySeriesNameAsync(string seriesName);


    }
}
