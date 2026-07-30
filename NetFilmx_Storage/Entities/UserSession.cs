using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Storage.Entities
{
    [Table("UserSessions")]
    public class UserSession : BaseEntity
    {
        internal UserSession()
        {
        }

        public UserSession(int userId, string refreshTokenHash, DateTime expiresAt, string? ipAddress = null, string? userAgent = null) : this()
        {
            UserId = userId;
            RefreshTokenHash = refreshTokenHash;
            ExpiresAt = expiresAt;
            IsRevoked = false;
            CreatedAt = DateTime.UtcNow;
            IpAddress = ipAddress;
            UserAgent = userAgent;
        }

        [Required]
        public int UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public virtual User User { get; set; }

        [Required]
        [MaxLength(128)]
        public string RefreshTokenHash { get; set; }

        [Required]
        public DateTime ExpiresAt { get; set; }

        [Required]
        public bool IsRevoked { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }

        [MaxLength(45)]
        public string? IpAddress { get; set; }

        [MaxLength(512)]
        public string? UserAgent { get; set; }
    }
}
