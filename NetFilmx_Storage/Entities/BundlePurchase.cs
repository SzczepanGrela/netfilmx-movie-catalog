using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Storage.Entities
{
    [Table("BundlePurchases")]
    public class BundlePurchase : BaseEntity
    {
        internal BundlePurchase()
        {
        }

        public BundlePurchase(int userId, int bundleId, decimal amount) : this()
        {
            UserId = userId;
            BundleId = bundleId;
            Amount = amount;
            PurchaseDate = DateTime.UtcNow;
        }

        [Required]
        public int UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public virtual User User { get; set; }

        [Required]
        public int BundleId { get; set; }

        [ForeignKey(nameof(BundleId))]
        public virtual Bundle Bundle { get; set; }

        [Required]
        [Column(TypeName = "decimal(18, 2)")]
        public decimal Amount { get; set; }

        [Required]
        public DateTime PurchaseDate { get; set; }
    }
}
