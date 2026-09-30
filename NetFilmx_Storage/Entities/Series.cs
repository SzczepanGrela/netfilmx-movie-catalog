using NetFilmx_Storage.Entities;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Storage.Entities
{
    [Table("Series")]
    public class Series : BaseEntity
    {
        internal Series()
        {
            Videos = new List<Video>();
            SeriesPurchases = new List<SeriesPurchase>();
            Bundles = new List<Bundle>();
        }

        public Series(string name, decimal price, string? description) : this()
        {
            Name = name;
            Price = price;
            Description = description;
            CreatedAt = DateTime.Now;
            UpdatedAt = DateTime.Now;
        }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        [Required]
        [Column(TypeName = "decimal(18, 2)")]
        [Range(0, 10001)]
        public decimal Price { get; set; }

        [MaxLength(2000)]

        public string? Description { get; set; }

        // --- Premium UI: Media Assets ---

        [MaxLength(500)]
        public string? PosterUrl { get; set; }

        [MaxLength(500)]
        public string? BackdropUrl { get; set; }

        [MaxLength(500)]
        public string? LogoUrl { get; set; }

        [MaxLength(500)]
        public string? TrailerUrl { get; set; }

        // --- Premium UI: Metadata ---

        public int? ReleaseYear { get; set; }

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
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }


        public virtual ICollection<Video> Videos { get; set; }


   
        public virtual ICollection<SeriesPurchase> SeriesPurchases { get; set; }

        public virtual ICollection<Bundle> Bundles { get; set; }

        public virtual ICollection<SeriesTranslation> Translations { get; set; } = new List<SeriesTranslation>();

        public string GetLocalizedName(string? lang = null)
        {
            if (string.IsNullOrEmpty(lang)) lang = "en";
            var tr = Translations?.FirstOrDefault(t => t.LanguageCode.Equals(lang, StringComparison.OrdinalIgnoreCase));
            if (tr != null && !string.IsNullOrWhiteSpace(tr.Name)) return tr.Name;

            var fallback = Translations?.FirstOrDefault(t => t.LanguageCode.Equals("en", StringComparison.OrdinalIgnoreCase));
            if (fallback != null && !string.IsNullOrWhiteSpace(fallback.Name)) return fallback.Name;

            return Name;
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
