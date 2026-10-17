using NetFilmx_Service.Dtos.Video;
using NetFilmx_Service.Dtos.Series;

namespace NetFilmx_Web.ViewModels
{
    public class HomePageViewModel
    {
        public VideoCardDto? FeaturedVideo { get; set; }
        public List<VideoCardDto> AllVideos { get; set; } = new();
        public List<SeriesCardDto> AllSeries { get; set; } = new();
    }
}
