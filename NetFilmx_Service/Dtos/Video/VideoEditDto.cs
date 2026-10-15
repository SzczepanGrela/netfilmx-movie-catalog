using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Service.Dtos.Video
{
    public class VideoEditDto : IVideoDto
    {
        public VideoEditDto() { }
        public VideoEditDto(int id, string title, string videoUrl, string thumbnailUrl, string? description, decimal price)
        {
            Id = id;
            Title = title;
            Price = price;
            VideoUrl = videoUrl;
            ThumbnailUrl = thumbnailUrl;
            Description = description;
        }



        public int Id { get; set; }
        public string? ProcessingError { get; set; }

        [StringLength(100, ErrorMessage = "The {0} must be at most {1} characters long.")]
        public string Title { get; set; }

        [StringLength(2000, ErrorMessage = "The {0} must be at most {1} characters long.")]
        public string? Description { get; set; }


        [Required]
        [Column(TypeName = "decimal(18, 2)")]
        [Range(0, 10001, ErrorMessage = "Price must be between {1} and {2}.")]
        public decimal Price { get; set; }

        [StringLength(200, ErrorMessage = "The {0} must be at most {1} characters long.")]
        [MinLength(3, ErrorMessage = "The {0} must be at least {1} characters long.")]
        public string VideoUrl { get; set; }

        [StringLength(200, ErrorMessage = "The {0} must be at most {1} characters long.")]
        [MinLength(3, ErrorMessage = "The {0} must be at least {1} characters long.")]
        public string ThumbnailUrl { get; set; }


    }
}
