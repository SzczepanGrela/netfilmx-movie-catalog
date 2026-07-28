using NetFilmx_Storage.Entities;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Storage.Entities
{
    [Table("Likes")]
    public class Like : BaseEntity
    {
        internal Like() 
        { 

        }

        public Like(int videoId, int userId) : this()
        {
            VideoId = videoId;
            UserId = userId;
            CreatedAt = DateTime.Now;
        }


        [Required]
        public int VideoId { get; set; }


        public virtual Video Video { get; set; }

        [Required]
        public int UserId { get; set; }

        public virtual User User { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }
    }
}
