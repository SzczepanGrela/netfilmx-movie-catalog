namespace NetFilmx_Service.Dtos.Series
{
    public class SeriesCardDto : ISeriesDto
    {
        public SeriesCardDto() { }

        public SeriesCardDto(int id, string name, string? description, decimal price,
            string? posterUrl, string? backdropUrl, string? logoUrl, string? trailerUrl,
            int? releaseYear, string? director, string? cast,
            string? ageRating, string? qualityBadge)
        {
            Id = id;
            Name = name;
            Description = description;
            Price = price;
            PosterUrl = posterUrl;
            BackdropUrl = backdropUrl;
            LogoUrl = logoUrl;
            TrailerUrl = trailerUrl;
            ReleaseYear = releaseYear;
            Director = director;
            Cast = cast;
            AgeRating = ageRating;
            QualityBadge = qualityBadge;
        }

        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public string? PosterUrl { get; set; }
        public string? BackdropUrl { get; set; }
        public string? LogoUrl { get; set; }
        public string? TrailerUrl { get; set; }
        public int? ReleaseYear { get; set; }
        public string? Director { get; set; }
        public string? Cast { get; set; }
        public string? AgeRating { get; set; }
        public string? QualityBadge { get; set; }
    }
}
