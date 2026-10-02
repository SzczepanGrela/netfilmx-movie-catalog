using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Storage.Entities
{
    [Table("CategoryTranslations")]
    public class CategoryTranslation : BaseEntity
    {
        internal CategoryTranslation()
        {
        }

        public CategoryTranslation(int categoryId, string languageCode, string name, string? description = null) : this()
        {
            CategoryId = categoryId;
            LanguageCode = languageCode?.ToLowerInvariant() ?? throw new ArgumentNullException(nameof(languageCode));
            Name = name ?? throw new ArgumentNullException(nameof(name));
            Description = description;
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
        }

        [Required]
        public int CategoryId { get; set; }

        [ForeignKey(nameof(CategoryId))]
        public virtual Category Category { get; set; }

        [Required]
        [MaxLength(10)]
        public string LanguageCode { get; set; } // "en", "pl"

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
