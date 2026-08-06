namespace NetFilmx_Service.Dtos.Video
{
    public class VideoCardDto : IVideoDto
    {
        public VideoCardDto() { }

        public VideoCardDto(int id, string title, string? description, string videoUrl, string thumbnailUrl,
            decimal price, string? backdropUrl, string? logoUrl, string? trailerUrl,
            int? releaseYear, int? durationMinutes, string? director, string? cast,
            string? ageRating, string? qualityBadge, string? maturityWarning)
        {
            Id = id;
            Title = title;
            Description = description;
            VideoUrl = videoUrl;
            ThumbnailUrl = thumbnailUrl;
            Price = price;
            BackdropUrl = backdropUrl;
            LogoUrl = logoUrl;
            TrailerUrl = trailerUrl;
            ReleaseYear = releaseYear;
            DurationMinutes = durationMinutes;
            Director = director;
            Cast = cast;
            AgeRating = ageRating;
            QualityBadge = qualityBadge;
            MaturityWarning = maturityWarning;
        }

        public int Id { get; set; }
        public string Title { get; set; }
        public string? Description { get; set; }
        public string VideoUrl { get; set; }
        public string ThumbnailUrl { get; set; }
        public decimal Price { get; set; }
        public string? BackdropUrl { get; set; }
        public string? LogoUrl { get; set; }
        public string? TrailerUrl { get; set; }
        public int? ReleaseYear { get; set; }
        public int? DurationMinutes { get; set; }
        public string? Director { get; set; }
        public string? Cast { get; set; }
        public string? AgeRating { get; set; }
        public string? QualityBadge { get; set; }
        public string? MaturityWarning { get; set; }
    }
}
