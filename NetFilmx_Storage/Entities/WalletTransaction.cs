using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Storage.Entities
{
    [Table("WalletTransactions")]
    public class WalletTransaction : BaseEntity
    {
        internal WalletTransaction()
        {
        }

        public WalletTransaction(int userId, decimal amount, TransactionType type, string description, decimal balanceAfter, int? relatedEntityId = null) : this()
        {
            UserId = userId;
            Amount = amount;
            Type = type;
            Description = description;
            BalanceAfter = balanceAfter;
            RelatedEntityId = relatedEntityId;
            CreatedAt = DateTime.UtcNow;
        }

        [Required]
        public int UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public virtual User User { get; set; }

        [Required]
        [Column(TypeName = "decimal(18, 2)")]
        public decimal Amount { get; set; }

        [Required]
        public TransactionType Type { get; set; }

        [Required]
        [MaxLength(500)]
        public string Description { get; set; }

        public int? RelatedEntityId { get; set; }

        [Required]
        [Column(TypeName = "decimal(18, 2)")]
        public decimal BalanceAfter { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }
    }
}
