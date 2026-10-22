using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Storage.Entities
{
    [Table("SeriesTranslations")]
    public class SeriesTranslation : BaseEntity
    {
        internal SeriesTranslation()
        {
        }

        public SeriesTranslation(int seriesId, string languageCode, string name, string? description = null, string? director = null, string? cast = null) : this()
        {
            SeriesId = seriesId;
            LanguageCode = languageCode?.ToLowerInvariant() ?? throw new ArgumentNullException(nameof(languageCode));
            Name = name ?? throw new ArgumentNullException(nameof(name));
            Description = description;
            Director = director;
            Cast = cast;
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
        }

        [Required]
        public int SeriesId { get; set; }

        [ForeignKey(nameof(SeriesId))]
        public virtual Series Series { get; set; }

        [Required]
        [MaxLength(10)]
        public string LanguageCode { get; set; } // "en", "pl"

        [Required]
        [MaxLength(200)]
        public string Name { get; set; }

        [MaxLength(3000)]
        public string? Description { get; set; }

        [MaxLength(200)]
        public string? Director { get; set; }

        [MaxLength(500)]
        public string? Cast { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
