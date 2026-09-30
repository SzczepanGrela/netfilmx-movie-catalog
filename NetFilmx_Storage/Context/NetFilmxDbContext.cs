using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using NetFilmx_Storage.Entities;

namespace NetFilmx_Storage.Context
{
    public class NetFilmxDbContext : DbContext
    {
        public NetFilmxDbContext(DbContextOptions<NetFilmxDbContext> options) : base(options)
        {

        }

        public DbSet<Video> Videos { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Tag> Tags { get; set; }
        public DbSet<Comment> Comments { get; set; }
        public DbSet<Like> Likes { get; set; }
        public DbSet<Series> Series { get; set; }
        public DbSet<VideoPurchase> VideoPurchases { get; set; }
        public DbSet<SeriesPurchase> SeriesPurchases { get; set; }
        public DbSet<UserSession> UserSessions { get; set; }
        public DbSet<WalletTransaction> WalletTransactions { get; set; }
        public DbSet<Bundle> Bundles { get; set; }
        public DbSet<BundlePurchase> BundlePurchases { get; set; }
        public DbSet<VideoTranslation> VideoTranslations { get; set; }
        public DbSet<SeriesTranslation> SeriesTranslations { get; set; }
        public DbSet<CategoryTranslation> CategoryTranslations { get; set; }
        public DbSet<TagTranslation> TagTranslations { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Many-to-Many relationships

            modelBuilder.Entity<Video>()
                .HasMany(v => v.Tags)
                .WithMany(t => t.Videos)
                .UsingEntity<Dictionary<string, object>>(
                    "VideoTag",
                    j => j.HasOne<Tag>().WithMany().HasForeignKey("TagId"),
                    j => j.HasOne<Video>().WithMany().HasForeignKey("VideoId"),
                    j => j.HasKey("TagId", "VideoId"));

            modelBuilder.Entity<Video>()
                .HasMany(v => v.Categories)
                .WithMany(c => c.Videos)
                .UsingEntity<Dictionary<string, object>>(
                    "VideoCategory",
                    j => j.HasOne<Category>().WithMany().HasForeignKey("CategoryId"),
                    j => j.HasOne<Video>().WithMany().HasForeignKey("VideoId"),
                    j => j.HasKey("CategoryId", "VideoId"));

            modelBuilder.Entity<Video>()
                .HasMany(v => v.Series)
                .WithMany(s => s.Videos)
                .UsingEntity<Dictionary<string, object>>(
                    "VideoSeries",
                    j => j.HasOne<Series>().WithMany().HasForeignKey("SeriesId"),
                    j => j.HasOne<Video>().WithMany().HasForeignKey("VideoId"),
                    j => j.HasKey("SeriesId", "VideoId"));

            modelBuilder.Entity<Bundle>()
                .HasMany(b => b.Videos)
                .WithMany(v => v.Bundles)
                .UsingEntity<Dictionary<string, object>>(
                    "BundleVideo",
                    j => j.HasOne<Video>().WithMany().HasForeignKey("VideoId"),
                    j => j.HasOne<Bundle>().WithMany().HasForeignKey("BundleId"),
                    j => j.HasKey("BundleId", "VideoId"));

            modelBuilder.Entity<Bundle>()
                .HasMany(b => b.Series)
                .WithMany(s => s.Bundles)
                .UsingEntity<Dictionary<string, object>>(
                    "BundleSeries",
                    j => j.HasOne<Series>().WithMany().HasForeignKey("SeriesId"),
                    j => j.HasOne<Bundle>().WithMany().HasForeignKey("BundleId"),
                    j => j.HasKey("BundleId", "SeriesId"));

            // One-to-Many relationships
            modelBuilder.Entity<Like>()
                .HasOne(l => l.Video)
                .WithMany(v => v.Likes)
                .HasForeignKey(l => l.VideoId);

            modelBuilder.Entity<Like>()
                .HasOne(l => l.User)
                .WithMany(u => u.Likes)
                .HasForeignKey(l => l.UserId);

            modelBuilder.Entity<Comment>()
               .HasOne(c => c.Video)
               .WithMany(v => v.Comments)
               .HasForeignKey(c => c.VideoId);

            modelBuilder.Entity<Comment>()
                .HasOne(c => c.User)
                .WithMany(u => u.Comments)
                .HasForeignKey(c => c.UserId);

            modelBuilder.Entity<VideoPurchase>()
                .HasOne(vp => vp.Video)
                .WithMany(v => v.VideoPurchases)
                .HasForeignKey(vp => vp.VideoId);

            modelBuilder.Entity<VideoPurchase>()
                .HasOne(vp => vp.User)
                .WithMany(u => u.VideoPurchases)
                .HasForeignKey(vp => vp.UserId);

            modelBuilder.Entity<SeriesPurchase>()
                .HasOne(sp => sp.Series)
                .WithMany(s => s.SeriesPurchases)
                .HasForeignKey(sp => sp.SeriesId);

            modelBuilder.Entity<SeriesPurchase>()
                .HasOne(sp => sp.User)
                .WithMany(u => u.SeriesPurchases)
                .HasForeignKey(sp => sp.UserId);

            modelBuilder.Entity<Bundle>()
                .HasMany(b => b.Videos)
                .WithMany(v => v.Bundles)
                .UsingEntity(j => j.ToTable("BundleVideos"));

            modelBuilder.Entity<Bundle>()
                .HasMany(b => b.Series)
                .WithMany(s => s.Bundles)
                .UsingEntity(j => j.ToTable("BundleSeries"));

            modelBuilder.Entity<BundlePurchase>()
                .HasOne(bp => bp.User)
                .WithMany(u => u.BundlePurchases)
                .HasForeignKey(bp => bp.UserId);

            modelBuilder.Entity<BundlePurchase>()
                .HasOne(bp => bp.Bundle)
                .WithMany()
                .HasForeignKey(bp => bp.BundleId);

            // UserSession relationships
            modelBuilder.Entity<UserSession>()
                .HasOne(s => s.User)
                .WithMany(u => u.Sessions)
                .HasForeignKey(s => s.UserId);

            // WalletTransaction relationships
            modelBuilder.Entity<WalletTransaction>()
                .HasOne(wt => wt.User)
                .WithMany(u => u.WalletTransactions)
                .HasForeignKey(wt => wt.UserId);

            // Multi-Language Translation Relationships & Unique Compound Indexes
            modelBuilder.Entity<VideoTranslation>()
                .HasOne(vt => vt.Video)
                .WithMany(v => v.Translations)
                .HasForeignKey(vt => vt.VideoId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<VideoTranslation>()
                .HasIndex(vt => new { vt.VideoId, vt.LanguageCode })
                .IsUnique();

            modelBuilder.Entity<SeriesTranslation>()
                .HasOne(st => st.Series)
                .WithMany(s => s.Translations)
                .HasForeignKey(st => st.SeriesId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SeriesTranslation>()
                .HasIndex(st => new { st.SeriesId, st.LanguageCode })
                .IsUnique();

            modelBuilder.Entity<CategoryTranslation>()
                .HasOne(ct => ct.Category)
                .WithMany(c => c.Translations)
                .HasForeignKey(ct => ct.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CategoryTranslation>()
                .HasIndex(ct => new { ct.CategoryId, ct.LanguageCode })
                .IsUnique();

            modelBuilder.Entity<TagTranslation>()
                .HasOne(tt => tt.Tag)
                .WithMany(t => t.Translations)
                .HasForeignKey(tt => tt.TagId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TagTranslation>()
                .HasIndex(tt => new { tt.TagId, tt.LanguageCode })
                .IsUnique();
        }
    }

    public class NetFilmxDbContextFactory : IDesignTimeDbContextFactory<NetFilmxDbContext>
    {
        public NetFilmxDbContext CreateDbContext(string[] args)
        {
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: true)
                .AddJsonFile("appsettings.Development.json", optional: true)
                .Build();

            var connectionString = configuration.GetConnectionString("DefaultConnection") 
                ?? "Host=localhost;Port=5432;Database=netfilmx_db;Username=netfilmx_user;Password=netfilmx_pass";

            var optionsBuilder = new DbContextOptionsBuilder<NetFilmxDbContext>();
            
            if (connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase))
            {
                optionsBuilder.UseNpgsql(connectionString);
            }
            else
            {
                optionsBuilder.UseSqlite(connectionString);
            }

            return new NetFilmxDbContext(optionsBuilder.Options);
        }
    }
}