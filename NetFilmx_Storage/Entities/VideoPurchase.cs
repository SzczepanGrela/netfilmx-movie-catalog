using NetFilmx_Storage.Entities;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Storage.Entities
{
    [Table("VideoPurchases")]
    public class VideoPurchase : BaseEntity
    {
        public VideoPurchase() 
        { 

        }

        public VideoPurchase(int userId, int videoId) : this()
        {
            UserId = userId;
            VideoId = videoId;
            PurchaseDate = DateTime.Now;
        }

        [Required]
        public int UserId { get; set; }

    
        public virtual User User { get; set; }

        [Required]
        public int VideoId { get; set; }

        public virtual Video Video { get; set; }

        [Required]
        public DateTime PurchaseDate { get; set; }
    }
}
