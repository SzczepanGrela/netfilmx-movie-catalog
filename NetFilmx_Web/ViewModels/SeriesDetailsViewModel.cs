using NetFilmx_Service.Dtos.Series;
using NetFilmx_Service.Dtos.Video;

namespace NetFilmx_Web.ViewModels
{
    public class SeriesDetailsViewModel
    {
        public SeriesCardDto Series { get; set; } = new();
        public List<VideoCardDto> Episodes { get; set; } = new();
        public decimal? UserBalance { get; set; }
        public bool IsPurchased { get; set; }
    }
}
