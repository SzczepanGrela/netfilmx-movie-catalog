using NetFilmx_Service.Dtos.Series;

namespace NetFilmx_Web.ViewModels
{
    public class SeriesPageViewModel
    {
        public List<SeriesCardDto> Series { get; set; } = new();
        public string? SearchTerm { get; set; }
        public string? DidYouMeanSuggestion { get; set; }
        public int CurrentPage { get; set; } = 1;
        public int TotalPages { get; set; } = 1;
        public int TotalCount { get; set; } = 0;
    }
}
