using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Storage.Entities
{
    [Table("TagTranslations")]
    public class TagTranslation : BaseEntity
    {
        internal TagTranslation()
        {
        }

        public TagTranslation(int tagId, string languageCode, string name) : this()
        {
            TagId = tagId;
            LanguageCode = languageCode?.ToLowerInvariant() ?? throw new ArgumentNullException(nameof(languageCode));
            Name = name ?? throw new ArgumentNullException(nameof(name));
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
        }

        [Required]
        public int TagId { get; set; }

        [ForeignKey(nameof(TagId))]
        public virtual Tag Tag { get; set; }

        [Required]
        [MaxLength(10)]
        public string LanguageCode { get; set; } // "en", "pl"

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
