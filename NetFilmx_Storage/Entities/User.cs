using NetFilmx_Storage.Entities;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Storage.Entities
{
    [Table("Users")]
    public class User : BaseEntity
    {
        internal User()
        {
            Comments = new List<Comment>();
            Likes = new List<Like>();
            VideoPurchases = new List<VideoPurchase>();
            SeriesPurchases = new List<SeriesPurchase>();
            Sessions = new List<UserSession>();
            WalletTransactions = new List<WalletTransaction>();
        }

        public User(string username, string email, string password, UserRole role = UserRole.User) : this()
        {
            Username = username;
            Email = email;
            SetPassword(password);
            Role = role;
            CreatedAt = DateTime.Now;
            UpdatedAt = DateTime.Now;
        }

        [Required]
        [MinLength(3)]
        [MaxLength(50)]
        public string Username { get; set; }

        [Required]
        [MinLength(3)]
        [MaxLength(50)]
        public string Email { get; set; }

        [Required]
        [MaxLength(255)]
        public string PasswordHash { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }

        [Required]
        public UserRole Role { get; set; } = UserRole.User;

        [Required]
        [Column(TypeName = "decimal(18, 2)")]
        public decimal Balance { get; set; } = 0;

        [MaxLength(512)]
        public string? AvatarUrl { get; set; }


        public virtual ICollection<Comment> Comments { get; set; }

    
        public virtual ICollection<Like> Likes { get; set; }


        public virtual ICollection<VideoPurchase> VideoPurchases { get; set; }


        public virtual ICollection<SeriesPurchase> SeriesPurchases { get; set; }

        public virtual ICollection<UserSession> Sessions { get; set; }

        public virtual ICollection<WalletTransaction> WalletTransactions { get; set; }

        [NotMapped]
        public IEnumerable<Video> CommentedVideos => Comments.Select(c => c.Video);

        [NotMapped]
        public IEnumerable<Video> LikedVideos => Likes.Select(l => l.Video);

        public void SetPassword(string password)
        {
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
        }

        public bool VerifyPassword(string password)
        {
            return BCrypt.Net.BCrypt.Verify(password, PasswordHash);
        }
    }
}
