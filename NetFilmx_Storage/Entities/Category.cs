using NetFilmx_Storage.Entities;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Storage.Entities
{
    [Table("Categories")]
    public class Category : BaseEntity
    {
        internal Category()
        {
            Videos = new List<Video>();
        }

        public Category(string name, string? description) : this()
        {
            Name = name;
            Description = description;
        }

        [Required]
        [MinLength(3)]
        [MaxLength(100)]
        public string Name { get; set; }

        [MaxLength(2000)]

        public string? Description { get; set; }

     
        public virtual ICollection<Video> Videos { get; set; }

        public virtual ICollection<CategoryTranslation> Translations { get; set; } = new List<CategoryTranslation>();

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
    }
}
