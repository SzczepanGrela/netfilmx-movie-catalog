using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Storage.Entities
{
    [Table("VideoTranslations")]
    public class VideoTranslation : BaseEntity
    {
        internal VideoTranslation()
        {
        }

        public VideoTranslation(int videoId, string languageCode, string title, string? description = null, string? director = null, string? cast = null) : this()
        {
            VideoId = videoId;
            LanguageCode = languageCode?.ToLowerInvariant() ?? throw new ArgumentNullException(nameof(languageCode));
            Title = title ?? throw new ArgumentNullException(nameof(title));
            Description = description;
            Director = director;
            Cast = cast;
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
        }

        [Required]
        public int VideoId { get; set; }

        [ForeignKey(nameof(VideoId))]
        public virtual Video Video { get; set; }

        [Required]
        [MaxLength(10)]
        public string LanguageCode { get; set; } // "en", "pl"

        [Required]
        [MaxLength(200)]
        public string Title { get; set; }

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
