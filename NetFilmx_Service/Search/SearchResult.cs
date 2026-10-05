using System.Collections.Generic;

namespace NetFilmx_Service.Search
{
    public class SearchResultItem
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string DocumentType { get; set; } = "Movie"; // "Movie" or "Series"
        public decimal Price { get; set; }
        public string? ThumbnailUrl { get; set; }
        public string? BackdropUrl { get; set; }
        public int? ReleaseYear { get; set; }
        public int? DurationMinutes { get; set; }
        public string? QualityBadge { get; set; }
        public string? AgeRating { get; set; }
        public double Score { get; set; }
        public string MatchedField { get; set; } = string.Empty;
    }

    public class SearchResultSet
    {
        public string Query { get; set; } = string.Empty;
        public string? DidYouMeanSuggestion { get; set; }
        public List<SearchResultItem> Items { get; set; } = new();
        public int TotalCount => Items.Count;
        public double ElapsedMilliseconds { get; set; }
    }
}
