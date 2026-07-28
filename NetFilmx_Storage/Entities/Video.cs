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
        }

        public Video(string title, string description, decimal price, string videoUrl, string thumbnailUrl) : this()
        {
            Title = title ?? throw new ArgumentNullException(nameof(title));
            Description = description;
            Price = price;
            VideoUrl = videoUrl ?? throw new ArgumentNullException(nameof(videoUrl));
            ThumbnailUrl = thumbnailUrl;
            CreatedAt = DateTime.Now;
            UpdatedAt = DateTime.Now;
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
        public string VideoUrl { get; set; }

        [MinLength(3)]
        [Required]
        public string ThumbnailUrl { get; set; }

        [Required]
        public int Views { get; set; } = 0;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.Now;


      
        public virtual ICollection<Like> Likes { get; set; }


   
        public virtual ICollection<Comment> Comments { get; set; }



        public virtual ICollection<Category> Categories { get; set; }


        public virtual ICollection<Tag> Tags { get; set; }


   
        public virtual ICollection<Series> Series { get; set; }


        public virtual ICollection<VideoPurchase> VideoPurchases { get; set; }
    }
}
