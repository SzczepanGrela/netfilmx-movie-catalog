using NetFilmx_Service.Dtos.Category;
using NetFilmx_Service.Dtos.Comment;
using NetFilmx_Service.Dtos.Tag;
using NetFilmx_Service.Dtos.Video;

namespace NetFilmx_Web.ViewModels
{
    public class MovieDetailsViewModel
    {
        public VideoCardDto Video { get; set; } = new();
        public List<CategoryListDto> Categories { get; set; } = new();
        public List<TagListDto> Tags { get; set; } = new();
        public List<CommentListDto> Comments { get; set; } = new();
        public decimal? UserBalance { get; set; }
        public bool IsPurchased { get; set; }
    }
}
