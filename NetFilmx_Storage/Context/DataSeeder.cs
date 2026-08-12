using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Entities;
using System;

namespace NetFilmx_Storage.Context
{
    public static class DataSeeder
    {
        public static void SeedData(ModelBuilder modelBuilder)
        {
            var videos = new[]
            {
                new Video
                {
                    Id = 1,
                    Title = "Sintel",
                    Description = "Samotna młoda wojowniczka imieniem Sintel ratuje i wychowuje rannego małego smoka, którego nazywa Scales. Kiedy dorosły smok porywa Scales, Sintel wyrusza w pełną niebezpieczeństw podróż przez surowe krajobrazy, by go uratować.",
                    Price = 225m,
                    VideoUrl = "/videos/sintel.mp4" ?? "missing",
                    ThumbnailUrl = "https://cdn.grela.dev/posters/sintel_poster.jpg" ?? "missing",
                    BackdropUrl = "https://cdn.grela.dev/backdrops/sintel_backdrop.png",
                    ReleaseYear = 2010,
                    DurationMinutes = 15,
                    Director = "Colin Levy",
                    Cast = "Halina Reijn, Thom Hoffman",
                    AgeRating = "13+",
                    QualityBadge = "4K HDR",
                    MaturityWarning = "Przemoc, Sceny Walki",
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                },
                new Video
                {
                    Id = 2,
                    Title = "Tears of Steel",
                    Description = "W dystopijnym Amsterdamie grupa naukowców i wojowników zbiera się w Oude Kerk, aby odtworzyć kluczowe wspomnienie z przeszłości i ocalić ludzkość przed armią destrukcyjnych robotów.",
                    Price = 180m,
                    VideoUrl = "/videos/tears-of-steel.mp4" ?? "missing",
                    ThumbnailUrl = "https://cdn.grela.dev/posters/tears-of-steel_poster.png" ?? "missing",
                    BackdropUrl = "https://cdn.grela.dev/backdrops/tears-of-steel_backdrop.jpg",
                    ReleaseYear = 2012,
                    DurationMinutes = 12,
                    Director = "Ian Hubert",
                    Cast = "Derek de Lint, Sergio Hasselbaink, Denise Rebergen",
                    AgeRating = "13+",
                    QualityBadge = "HD",
                    MaturityWarning = "Przemoc, Wulgaryzmy",
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                },
                new Video
                {
                    Id = 3,
                    Title = "Big Buck Bunny",
                    Description = "Spokojny dzień olbrzymiego królika w lesie zostaje zrujnowany przez trzy złośliwe gryzonie, które niszczą motyla i nękają go. Królik planuje serię pomysłowych i komicznych pułapek, by się zemścić.",
                    Price = 150m,
                    VideoUrl = null ?? "missing",
                    ThumbnailUrl = "https://cdn.grela.dev/posters/big-buck-bunny_poster.jpg" ?? "missing",
                    BackdropUrl = "https://cdn.grela.dev/backdrops/big-buck-bunny_backdrop.png",
                    ReleaseYear = 2008,
                    DurationMinutes = 10,
                    Director = "Sacha Goedegebure",
                    Cast = "Jan Morgenstern",
                    AgeRating = "7+",
                    QualityBadge = "4K",
                    MaturityWarning = null,
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                },
                new Video
                {
                    Id = 4,
                    Title = "Spring",
                    Description = "Młoda pasterka i jej wierny pies wędrują w górski las spowity mgłą, by stawić czoła pradawnym duchom i odprawić rytuał przodków, który zwiastuje nadejście wiosny.",
                    Price = 120m,
                    VideoUrl = "/videos/spring.mp4" ?? "missing",
                    ThumbnailUrl = null ?? "missing",
                    BackdropUrl = null,
                    ReleaseYear = 2019,
                    DurationMinutes = 8,
                    Director = "Andreas Goralczyk",
                    Cast = "Sander Houtman (dźwięk)",
                    AgeRating = "7+",
                    QualityBadge = "4K HDR",
                    MaturityWarning = null,
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                },
                new Video
                {
                    Id = 5,
                    Title = "Charge",
                    Description = "W dystopijnej przyszłości wątły staruszek włamuje się do zautomatyzowanej stacji ładowania baterii, by pozyskać energię, co wywołuje konfrontację ze śmiercionośnym robotem ochronnym.",
                    Price = 50m,
                    VideoUrl = "/videos/charge.webm" ?? "missing",
                    ThumbnailUrl = "https://cdn.grela.dev/posters/charge_poster.jpg" ?? "missing",
                    BackdropUrl = "https://cdn.grela.dev/backdrops/charge_backdrop.jpg",
                    ReleaseYear = 2022,
                    DurationMinutes = 3,
                    Director = "Hjalti Hjálmarsson",
                    Cast = "Sander Houtman (dźwięk)",
                    AgeRating = "13+",
                    QualityBadge = "4K HDR",
                    MaturityWarning = "Przemoc",
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                },
                new Video
                {
                    Id = 6,
                    Title = "Elephants Dream",
                    Description = "Proog i Emo eksplorują dziwaczny, mechaniczny świat znany jako 'Maszyna'. Przemierzając jej zmieniające się, surrealistyczne pokoje, ich odmienne światopoglądy prowadzą do dramatycznego punktu zwrotnego.",
                    Price = 165m,
                    VideoUrl = "/videos/elephants-dream.mp4" ?? "missing",
                    ThumbnailUrl = "https://cdn.grela.dev/posters/elephants-dream_poster.jpg" ?? "missing",
                    BackdropUrl = "https://cdn.grela.dev/backdrops/elephants-dream_backdrop.jpg",
                    ReleaseYear = 2006,
                    DurationMinutes = 11,
                    Director = "Bassam Kurdali",
                    Cast = "Tygo Gernandt, Cas Jansen",
                    AgeRating = "13+",
                    QualityBadge = "HD",
                    MaturityWarning = "Surrealizm",
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                },
                new Video
                {
                    Id = 7,
                    Title = "Agent 327: Operation Barbershop",
                    Description = "Holenderski tajny agent 327 bada salon fryzjerski będący przykrywką dla syndykatu przestępczego w Amsterdamie. Czeka go pełna akcji walka z groźnym fryzjerem-złoczyńcą.",
                    Price = 60m,
                    VideoUrl = null ?? "missing",
                    ThumbnailUrl = "https://cdn.grela.dev/posters/agent-327_poster.jpg" ?? "missing",
                    BackdropUrl = null,
                    ReleaseYear = 2017,
                    DurationMinutes = 4,
                    Director = "Colin Levy, Hjalti Hjálmarsson",
                    Cast = "Sander Houtman (dźwięk)",
                    AgeRating = "7+",
                    QualityBadge = "4K",
                    MaturityWarning = null,
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                },
                new Video
                {
                    Id = 8,
                    Title = "Coffee Run",
                    Description = "Młoda kobieta wychodzi kupić kawę, co prowadzi do napędzanej kofeiną emocjonalnej sekwencji, w której przeżywa kluczowe momenty i wspomnienia z dawnego romansu.",
                    Price = 50m,
                    VideoUrl = null ?? "missing",
                    ThumbnailUrl = null ?? "missing",
                    BackdropUrl = null,
                    ReleaseYear = 2020,
                    DurationMinutes = 3,
                    Director = "Hjalti Hjálmarsson",
                    Cast = "Sander Houtman (dźwięk)",
                    AgeRating = "7+",
                    QualityBadge = "4K",
                    MaturityWarning = null,
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                },
                new Video
                {
                    Id = 9,
                    Title = "Caminandes: Llama Drama",
                    Description = "Lama Koro próbuje przejść przez opustoszałą drogę gruntową w Patagonii, napotykając serię komicznych zagrożeń, w tym uparty płot i pędzące samochody.",
                    Price = 50m,
                    VideoUrl = "/videos/caminandes-llama-drama.mp4" ?? "missing",
                    ThumbnailUrl = "https://cdn.grela.dev/posters/caminandes-llama-drama_poster.jpg" ?? "missing",
                    BackdropUrl = "https://cdn.grela.dev/backdrops/caminandes-llama-drama_backdrop.jpg",
                    ReleaseYear = 2013,
                    DurationMinutes = 2,
                    Director = "Pablo Vázquez",
                    Cast = "Jan Morgenstern (dźwięk)",
                    AgeRating = "7+",
                    QualityBadge = "HD",
                    MaturityWarning = null,
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                },
                new Video
                {
                    Id = 10,
                    Title = "Caminandes: Gran Dillama",
                    Description = "Lama Koro odkrywa soczystą jagodę po drugiej stronie ogrodzenia z drutu kolczastego, podejmując absurdalne próby dotarcia do przysmaku.",
                    Price = 50m,
                    VideoUrl = "/videos/caminandes-gran-dillama.zip" ?? "missing",
                    ThumbnailUrl = "https://cdn.grela.dev/posters/caminandes-gran-dillama_poster.jpg" ?? "missing",
                    BackdropUrl = "https://cdn.grela.dev/backdrops/caminandes-gran-dillama_backdrop.jpg",
                    ReleaseYear = 2013,
                    DurationMinutes = 2,
                    Director = "Pablo Vázquez",
                    Cast = "Jan Morgenstern (dźwięk)",
                    AgeRating = "7+",
                    QualityBadge = "HD",
                    MaturityWarning = null,
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                },
                new Video
                {
                    Id = 11,
                    Title = "Caminandes: Llamigos",
                    Description = "W śnieżnej scenerii lama Koro spotyka pingwina Oti. Dwie ekscentryczne postacie wdają się w slapstickową rywalizację o jedną czerwoną jagodę na lodzie.",
                    Price = 50m,
                    VideoUrl = "/videos/caminandes-llamigos.webm" ?? "missing",
                    ThumbnailUrl = "https://cdn.grela.dev/posters/caminandes-llamigos_poster.jpg" ?? "missing",
                    BackdropUrl = "https://cdn.grela.dev/backdrops/caminandes-llamigos_backdrop.jpg",
                    ReleaseYear = 2016,
                    DurationMinutes = 3,
                    Director = "Pablo Vázquez",
                    Cast = "Sander Houtman (dźwięk)",
                    AgeRating = "7+",
                    QualityBadge = "HD",
                    MaturityWarning = null,
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                },
                new Video
                {
                    Id = 12,
                    Title = "Caminandes: Llama Drama",
                    Description = "Lama Koro próbuje przejść przez opustoszałą drogę gruntową w Patagonii, napotykając serię komicznych zagrożeń, w tym uparty płot i pędzące samochody.",
                    Price = 50m,
                    VideoUrl = "/videos/caminandes-llama-drama.mp4" ?? "missing",
                    ThumbnailUrl = "https://cdn.grela.dev/posters/caminandes-llama-drama_poster.jpg" ?? "missing",
                    BackdropUrl = "https://cdn.grela.dev/backdrops/caminandes-llama-drama_backdrop.jpg",
                    ReleaseYear = 2013,
                    DurationMinutes = 2,
                    Director = "Pablo Vázquez",
                    Cast = "Jan Morgenstern (dźwięk)",
                    AgeRating = "7+",
                    QualityBadge = "HD",
                    MaturityWarning = null,
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                },
                new Video
                {
                    Id = 13,
                    Title = "Caminandes: Gran Dillama",
                    Description = "Lama Koro odkrywa soczystą jagodę po drugiej stronie ogrodzenia z drutu kolczastego, podejmując absurdalne próby dotarcia do przysmaku.",
                    Price = 50m,
                    VideoUrl = "/videos/caminandes-gran-dillama.zip" ?? "missing",
                    ThumbnailUrl = null ?? "missing",
                    BackdropUrl = null,
                    ReleaseYear = 2013,
                    DurationMinutes = 2,
                    Director = "Pablo Vázquez",
                    Cast = "Jan Morgenstern (dźwięk)",
                    AgeRating = "7+",
                    QualityBadge = "HD",
                    MaturityWarning = null,
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                },
                new Video
                {
                    Id = 14,
                    Title = "Caminandes: Llamigos",
                    Description = "W śnieżnej scenerii lama Koro spotyka pingwina Oti. Dwie ekscentryczne postacie wdają się w slapstickową rywalizację o jedną czerwoną jagodę na lodzie.",
                    Price = 50m,
                    VideoUrl = "/videos/caminandes-llamigos.webm" ?? "missing",
                    ThumbnailUrl = "https://cdn.grela.dev/posters/caminandes-llamigos_poster.jpg" ?? "missing",
                    BackdropUrl = "https://cdn.grela.dev/backdrops/caminandes-llamigos_backdrop.jpg",
                    ReleaseYear = 2016,
                    DurationMinutes = 3,
                    Director = "Pablo Vázquez",
                    Cast = "Sander Houtman (dźwięk)",
                    AgeRating = "7+",
                    QualityBadge = "HD",
                    MaturityWarning = null,
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                },
                new Video
                {
                    Id = 15,
                    Title = "Caminandes: Llama Drama",
                    Description = "Lama Koro próbuje przejść przez opustoszałą drogę gruntową w Patagonii, napotykając serię komicznych zagrożeń, w tym uparty płot i pędzące samochody.",
                    Price = 50m,
                    VideoUrl = "/videos/caminandes-llama-drama.mp4" ?? "missing",
                    ThumbnailUrl = "https://cdn.grela.dev/posters/caminandes-llama-drama_poster.jpg" ?? "missing",
                    BackdropUrl = "https://cdn.grela.dev/backdrops/caminandes-llama-drama_backdrop.jpg",
                    ReleaseYear = 2013,
                    DurationMinutes = 2,
                    Director = "Pablo Vázquez",
                    Cast = "Jan Morgenstern (dźwięk)",
                    AgeRating = "7+",
                    QualityBadge = "HD",
                    MaturityWarning = null,
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                },
                new Video
                {
                    Id = 16,
                    Title = "Caminandes: Gran Dillama",
                    Description = "Lama Koro odkrywa soczystą jagodę po drugiej stronie ogrodzenia z drutu kolczastego, podejmując absurdalne próby dotarcia do przysmaku.",
                    Price = 50m,
                    VideoUrl = "/videos/caminandes-gran-dillama.zip" ?? "missing",
                    ThumbnailUrl = null ?? "missing",
                    BackdropUrl = null,
                    ReleaseYear = 2013,
                    DurationMinutes = 2,
                    Director = "Pablo Vázquez",
                    Cast = "Jan Morgenstern (dźwięk)",
                    AgeRating = "7+",
                    QualityBadge = "HD",
                    MaturityWarning = null,
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                },
                new Video
                {
                    Id = 17,
                    Title = "Caminandes: Llamigos",
                    Description = "W śnieżnej scenerii lama Koro spotyka pingwina Oti. Dwie ekscentryczne postacie wdają się w slapstickową rywalizację o jedną czerwoną jagodę na lodzie.",
                    Price = 50m,
                    VideoUrl = "/videos/caminandes-llamigos.webm" ?? "missing",
                    ThumbnailUrl = "https://cdn.grela.dev/posters/caminandes-llamigos_poster.jpg" ?? "missing",
                    BackdropUrl = "https://cdn.grela.dev/backdrops/caminandes-llamigos_backdrop.jpg",
                    ReleaseYear = 2016,
                    DurationMinutes = 3,
                    Director = "Pablo Vázquez",
                    Cast = "Sander Houtman (dźwięk)",
                    AgeRating = "7+",
                    QualityBadge = "HD",
                    MaturityWarning = null,
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                }
            };

            var series = new[]
            {
                new Series
                {
                    Id = 1,
                    Name = "Caminandes",
                    Description = "Seria trzech zabawnych krótkometrażówek o lamie Koro, która w Patagonii napotyka coraz bardziej absurdalne przeszkody.",
                    Price = 250m,
                    PosterUrl = null,
                    BackdropUrl = null,
                    ReleaseYear = 2013,
                    Director = "Pablo Vázquez",
                    Cast = "Jan Morgenstern, Sander Houtman (dźwięk)",
                    AgeRating = "7+",
                    QualityBadge = "HD",
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                }
            };

            var bundles = new[]
            {
                new Bundle
                {
                    Id = 1,
                    Name = "Blender Studio Classics",
                    Description = "Sintel, Big Buck Bunny i Elephants Dream w jednym pakiecie.",
                    Price = 600m,
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                },
                new Bundle
                {
                    Id = 2,
                    Name = "Sci-Fi & Cyberpunk Collection",
                    Description = "Tears of Steel i Charge — dwie wizje przyszłości.",
                    Price = 300m,
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                },
                new Bundle
                {
                    Id = 3,
                    Name = "NetFilmx Full Experience",
                    Description = "Wszystkie filmy i seriale w jednym pakiecie.",
                    Price = 1200m,
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                }
            };

            modelBuilder.Entity<Video>().HasData(videos);
            modelBuilder.Entity<Series>().HasData(series);
            modelBuilder.Entity<Bundle>().HasData(bundles);

            // Junction tables (Implicit Many-to-Many)
            // Assuming EF Core default conventions for implicit many-to-many junction tables
            
            var videoSeries = new[]
            {
                new { VideosId = 15, SeriesId = 1 },
                new { VideosId = 16, SeriesId = 1 },
                new { VideosId = 17, SeriesId = 1 }
            };
            
            var bundleVideos = new[]
            {
                new { BundlesId = 1, VideosId = 1 },
                new { BundlesId = 1, VideosId = 3 },
                new { BundlesId = 1, VideosId = 6 },
                new { BundlesId = 2, VideosId = 2 },
                new { BundlesId = 2, VideosId = 5 },
                new { BundlesId = 3, VideosId = 1 },
                new { BundlesId = 3, VideosId = 2 },
                new { BundlesId = 3, VideosId = 3 },
                new { BundlesId = 3, VideosId = 4 },
                new { BundlesId = 3, VideosId = 5 },
                new { BundlesId = 3, VideosId = 6 },
                new { BundlesId = 3, VideosId = 7 },
                new { BundlesId = 3, VideosId = 8 }
            };
            
            var bundleSeries = new[]
            {
                new { BundlesId = 3, SeriesId = 1 }
            };

            modelBuilder.Entity("SeriesVideo").HasData(videoSeries);
            modelBuilder.Entity("BundleVideo").HasData(bundleVideos);
            modelBuilder.Entity("BundleSeries").HasData(bundleSeries);
            
            // Add some base users
            var users = new[]
            {
                new User { Id = 1, Username = "Admin", Email = "admin@netfilmx.pl", PasswordHash = "$argon2id$v=19$m=131072,t=4,p=8$bU6pyAC6bLUqvG2PoPZlEA==$toTuazRwhHzVf9uXC8cxKFFo823X4vz1x1qv/xkZxCQ=", Role = UserRole.Admin, CreatedAt = new DateTime(2025, 1, 1), UpdatedAt = new DateTime(2025, 1, 1) },
                new User { Id = 2, Username = "User", Email = "user@netfilmx.pl", PasswordHash = "$argon2id$v=19$m=131072,t=4,p=8$vS9lXQHm4yERia89MaHh+A==$du5OA68CWWu66WayByFV4qUvQGrTkNryYBAqzuuvuhE=", Role = UserRole.User, CreatedAt = new DateTime(2025, 1, 1), UpdatedAt = new DateTime(2025, 1, 1) },
            };
            modelBuilder.Entity<User>().HasData(users);
        }
    }
}
