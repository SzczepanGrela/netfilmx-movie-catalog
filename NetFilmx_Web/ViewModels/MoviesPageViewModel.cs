using NetFilmx_Service.Dtos.Category;
using NetFilmx_Service.Dtos.Tag;
using NetFilmx_Service.Dtos.Video;

namespace NetFilmx_Web.ViewModels
{
    public class MoviesPageViewModel
    {
        public List<VideoCardDto> Videos { get; set; } = new();
        public List<CategoryListDto> Categories { get; set; } = new();
        public List<TagListDto> Tags { get; set; } = new();
        public int? SelectedCategoryId { get; set; }
        public int? SelectedTagId { get; set; }
        public string? SearchTerm { get; set; }
        public string? DidYouMeanSuggestion { get; set; }
        public int CurrentPage { get; set; } = 1;
        public int TotalPages { get; set; } = 1;
        public int TotalCount { get; set; } = 0;
    }
}
