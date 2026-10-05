using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Service.Dtos.Series
{
    public class SeriesAddDto : ISeriesDto
    {
        public SeriesAddDto()
        {
        }

        public SeriesAddDto(string name, string? description, decimal price)
        {
            Name = name;
            Description = description;
            Price = price;

        }

        [StringLength(50, ErrorMessage = "The {0} must be at most {1} characters long.")]

        public string Name { get; set; }


        [StringLength(2000, ErrorMessage = "The {0} must be at most {1} characters long.")]

        public string? Description { get; set; }


        [Required]
        [Column(TypeName = "decimal(18, 2)")]
        [Range(0, 10001, ErrorMessage = "Price must be between {1} and {2}.")]
        public decimal Price { get; set; }

    }
}
