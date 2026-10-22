using NetFilmx_Storage.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace NetFilmx_Service.Search
{
    public interface ISearchEngine
    {
        void IndexVideo(Video video);
        void IndexSeries(Series series);
        void RemoveVideo(int videoId);
        void RemoveSeries(int seriesId);
        void Warmup(IEnumerable<Video> videos, IEnumerable<Series> series);
        SearchResultSet Search(string query, string? lang = "en", string? documentType = null, int? categoryId = null, int limit = 30);
    }
}
