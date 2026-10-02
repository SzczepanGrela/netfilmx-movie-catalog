using NetFilmx_Storage.Entities;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Storage.Entities
{
    [Table("Videos")]
    public class Video : BaseEntity
    {
        internal Video()
        {
            Likes = new List<Like>();
            Comments = new List<Comment>();
            Categories = new List<Category>();
            Tags = new List<Tag>();
            Series = new List<Series>();
            VideoPurchases = new List<VideoPurchase>();
            Bundles = new List<Bundle>();
        }

        public Video(string title, string description, decimal price, string videoUrl, string thumbnailUrl) : this()
        {
            Title = title ?? throw new ArgumentNullException(nameof(title));
            Description = description;
            Price = price;
            VideoUrl = videoUrl ?? throw new ArgumentNullException(nameof(videoUrl));
            ThumbnailUrl = thumbnailUrl;
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
        }

        [Required]
        [MaxLength(100)]
        public string Title { get; set; }

        [MaxLength(2000)]
        public string? Description { get; set; }

        [Required]
        [Column(TypeName = "decimal(18, 2)")]
        [Range(0, 10001)]
        public decimal Price { get; set; }

        [Required]
        [MinLength(3)]
        [ConcurrencyCheck]
        public string VideoUrl { get; set; }

        [MinLength(3)]
        [Required]
        public string ThumbnailUrl { get; set; }

        // Durable dispatch intent is saved in the same transaction as the catalogue row.
        [MaxLength(32)]
        [ConcurrencyCheck]
        public string? SourceUploadId { get; set; }

        [MaxLength(100)]
        public string? UploadJobId { get; set; }

        [Required]
        public int Views { get; set; } = 0;

        // --- Premium UI: Media Assets ---

        [MaxLength(500)]
        public string? BackdropUrl { get; set; }

        [MaxLength(500)]
        public string? LogoUrl { get; set; }

        [MaxLength(500)]
        public string? TrailerUrl { get; set; }

        // --- Premium UI: Metadata ---

        public int? ReleaseYear { get; set; }

        public int? DurationMinutes { get; set; }

        [MaxLength(200)]
        public string? Director { get; set; }

        [MaxLength(500)]
        public string? Cast { get; set; }

        // --- Premium UI: Badges & Classification ---

        [MaxLength(10)]
        public string? AgeRating { get; set; }

        [MaxLength(20)]
        public string? QualityBadge { get; set; }

        [MaxLength(200)]
        public string? MaturityWarning { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;


      
        public virtual ICollection<Like> Likes { get; set; }


   
        public virtual ICollection<Comment> Comments { get; set; }



        public virtual ICollection<Category> Categories { get; set; }


        public virtual ICollection<Tag> Tags { get; set; }


   
        public virtual ICollection<Series> Series { get; set; }


        public virtual ICollection<VideoPurchase> VideoPurchases { get; set; }

        public virtual ICollection<Bundle> Bundles { get; set; }

        public virtual ICollection<VideoTranslation> Translations { get; set; } = new List<VideoTranslation>();

        public string GetLocalizedTitle(string? lang = null)
        {
            if (string.IsNullOrEmpty(lang)) lang = "en";
            var tr = Translations?.FirstOrDefault(t => t.LanguageCode.Equals(lang, StringComparison.OrdinalIgnoreCase));
            if (tr != null && !string.IsNullOrWhiteSpace(tr.Title)) return tr.Title;

            var fallback = Translations?.FirstOrDefault(t => t.LanguageCode.Equals("en", StringComparison.OrdinalIgnoreCase));
            if (fallback != null && !string.IsNullOrWhiteSpace(fallback.Title)) return fallback.Title;

            return Title;
        }

        public string GetLocalizedDescription(string? lang = null)
        {
            if (string.IsNullOrEmpty(lang)) lang = "en";
            var tr = Translations?.FirstOrDefault(t => t.LanguageCode.Equals(lang, StringComparison.OrdinalIgnoreCase));
            if (tr != null && !string.IsNullOrWhiteSpace(tr.Description)) return tr.Description;

            var fallback = Translations?.FirstOrDefault(t => t.LanguageCode.Equals("en", StringComparison.OrdinalIgnoreCase));
            if (fallback != null && !string.IsNullOrWhiteSpace(fallback.Description)) return fallback.Description;

            return Description ?? "";
        }

        public string GetLocalizedDirector(string? lang = null)
        {
            if (string.IsNullOrEmpty(lang)) lang = "en";
            var tr = Translations?.FirstOrDefault(t => t.LanguageCode.Equals(lang, StringComparison.OrdinalIgnoreCase));
            if (tr != null && !string.IsNullOrWhiteSpace(tr.Director)) return tr.Director;

            var fallback = Translations?.FirstOrDefault(t => t.LanguageCode.Equals("en", StringComparison.OrdinalIgnoreCase));
            if (fallback != null && !string.IsNullOrWhiteSpace(fallback.Director)) return fallback.Director;

            return Director ?? "";
        }

        public string GetLocalizedCast(string? lang = null)
        {
            if (string.IsNullOrEmpty(lang)) lang = "en";
            var tr = Translations?.FirstOrDefault(t => t.LanguageCode.Equals(lang, StringComparison.OrdinalIgnoreCase));
            if (tr != null && !string.IsNullOrWhiteSpace(tr.Cast)) return tr.Cast;

            var fallback = Translations?.FirstOrDefault(t => t.LanguageCode.Equals("en", StringComparison.OrdinalIgnoreCase));
            if (fallback != null && !string.IsNullOrWhiteSpace(fallback.Cast)) return fallback.Cast;

            return Cast ?? "";
        }
    }
}
