using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Storage.Entities
{
    [Table("Bundles")]
    public class Bundle : BaseEntity
    {
        internal Bundle()
        {
            Videos = new List<Video>();
            Series = new List<Series>();
            BundlePurchases = new List<BundlePurchase>();
        }

        public Bundle(string name, string description, decimal price) : this()
        {
            Name = name ?? throw new ArgumentNullException(nameof(name));
            Description = description;
            Price = price;
            CreatedAt = DateTime.Now;
            UpdatedAt = DateTime.Now;
        }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        [MaxLength(2000)]
        public string? Description { get; set; }

        [Required]
        [Column(TypeName = "decimal(18, 2)")]
        [Range(0, 10001)]
        public decimal Price { get; set; }

        // --- Premium UI: Media Assets ---

        [MaxLength(500)]
        public string? PosterUrl { get; set; }

        [MaxLength(500)]
        public string? BackdropUrl { get; set; }

        [MaxLength(500)]
        public string? LogoUrl { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }

        public virtual ICollection<Video> Videos { get; set; }
        public virtual ICollection<Series> Series { get; set; }
        public virtual ICollection<BundlePurchase> BundlePurchases { get; set; }
    }
}
