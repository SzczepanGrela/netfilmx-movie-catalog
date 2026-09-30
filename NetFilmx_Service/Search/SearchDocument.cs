using System.Collections.Generic;

namespace NetFilmx_Service.Search
{
    public class SearchDocument
    {
        public int Id { get; set; }
        public string PrimaryTitle { get; set; } = string.Empty;
        public string DocumentType { get; set; } = "Movie"; // "Movie" or "Series"
        public decimal Price { get; set; }
        public string? ThumbnailUrl { get; set; }
        public string? BackdropUrl { get; set; }
        public int? ReleaseYear { get; set; }
        public int? DurationMinutes { get; set; }
        public string? QualityBadge { get; set; }
        public string? AgeRating { get; set; }
        public List<int> CategoryIds { get; set; } = new();

        // Localized fields: LanguageCode -> Text
        public Dictionary<string, string> Titles { get; set; } = new(System.StringComparer.OrdinalIgnoreCase);
        public Dictionary<string, string> Descriptions { get; set; } = new(System.StringComparer.OrdinalIgnoreCase);
        public Dictionary<string, string> Directors { get; set; } = new(System.StringComparer.OrdinalIgnoreCase);
        public Dictionary<string, string> Casts { get; set; } = new(System.StringComparer.OrdinalIgnoreCase);

        // Pre-tokenized and weighted entries for search matching
        public List<IndexedFieldToken> IndexedTokens { get; set; } = new();

        public string GetDisplayTitle(string? lang)
        {
            if (string.IsNullOrEmpty(lang)) lang = "en";
            if (Titles.TryGetValue(lang, out var t) && !string.IsNullOrWhiteSpace(t)) return t;
            if (Titles.TryGetValue("en", out var enT) && !string.IsNullOrWhiteSpace(enT)) return enT;
            return PrimaryTitle;
        }

        public string GetDisplayDescription(string? lang)
        {
            if (string.IsNullOrEmpty(lang)) lang = "en";
            if (Descriptions.TryGetValue(lang, out var d) && !string.IsNullOrWhiteSpace(d)) return d;
            if (Descriptions.TryGetValue("en", out var enD) && !string.IsNullOrWhiteSpace(enD)) return enD;
            return string.Empty;
        }
    }

    public class IndexedFieldToken
    {
        public string Token { get; set; } = string.Empty;
        public double FieldWeight { get; set; } // Title: 3.5, Director/Cast: 2.0, Tags/Categories: 1.5, Description: 1.0
        public string FieldName { get; set; } = string.Empty;
        public string LanguageCode { get; set; } = string.Empty;
    }
}
