using System.ComponentModel.DataAnnotations;

namespace NetFilmx_Service.Dtos.Category
{
    public class CategoryEditDto : ICategoryDto
    {
        public CategoryEditDto() { }

        public CategoryEditDto(string name, string? description, int id)
        {
            Name = name;
            Description = description;
            Id = id;
        }


        [StringLength(50, ErrorMessage = "The {0} must be at most {1} characters long.")]
        public string Name { get; set; }

        public int Id { get; set; }


        [StringLength(2000, ErrorMessage = "The {0} must be at most {1} characters long.")]
        public string? Description { get; set; }

    }
}
