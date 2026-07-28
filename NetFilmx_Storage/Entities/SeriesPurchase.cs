using NetFilmx_Storage.Entities;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Storage.Entities
{
    [Table("SeriesPurchases")]
    public class SeriesPurchase : BaseEntity
    {
        public SeriesPurchase() 
        {

        
        }

        public SeriesPurchase(int userId, int seriesId) : this()
        {
            UserId = userId;
            SeriesId = seriesId;
            PurchaseDate = DateTime.Now;
        }

        [Required]
        public int UserId { get; set; }


        public virtual User User { get; set; }

        [Required]
        public int SeriesId { get; set; }

        public virtual Series Series { get; set; }

        [Required]
        public DateTime PurchaseDate { get; set; }
    }
}
