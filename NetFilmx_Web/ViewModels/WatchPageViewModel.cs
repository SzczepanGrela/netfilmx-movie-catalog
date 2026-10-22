using NetFilmx_Service.Dtos.Video;

namespace NetFilmx_Web.ViewModels
{
    public class WatchPageViewModel
    {
        public VideoCardDto Video { get; set; } = new();
        public decimal? UserBalance { get; set; }
        public bool IsPurchased { get; set; }
    }
}
