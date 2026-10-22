using NetFilmx_Storage.Entities;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Storage.Entities
{
    [Table("Tags")]
    public class Tag : BaseEntity
    {
        internal Tag()
        {
            Videos = new List<Video>();
        }

        public Tag(string name) : this()
        {
            Name = name;
        }

        [Required]
        [MaxLength(100)]
        [MinLength(1)]
        public string Name { get; set; }



        public virtual ICollection<Video> Videos { get; set; }

        public virtual ICollection<TagTranslation> Translations { get; set; } = new List<TagTranslation>();

        public string GetLocalizedName(string? lang = null)
        {
            if (string.IsNullOrEmpty(lang)) lang = "en";
            var tr = Translations?.FirstOrDefault(t => t.LanguageCode.Equals(lang, StringComparison.OrdinalIgnoreCase));
            if (tr != null && !string.IsNullOrWhiteSpace(tr.Name)) return tr.Name;

            var fallback = Translations?.FirstOrDefault(t => t.LanguageCode.Equals("en", StringComparison.OrdinalIgnoreCase));
            if (fallback != null && !string.IsNullOrWhiteSpace(fallback.Name)) return fallback.Name;

            return Name;
        }
    }
}
