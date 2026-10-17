using NetFilmx_Storage.Entities;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text.RegularExpressions;

namespace NetFilmx_Service.Search
{
    public class QwertySearchEngine : ISearchEngine
    {
        private readonly ConcurrentDictionary<string, SearchDocument> _documents = new(StringComparer.Ordinal);
        private static readonly Regex TokenSplitRegex = new(@"[\s,.;:!?'""()\[\]{}\-_/\\]+", RegexOptions.Compiled);

        public void Warmup(IEnumerable<Video> videos, IEnumerable<Series> series)
        {
            _documents.Clear();
            if (videos != null)
            {
                foreach (var video in videos)
                {
                    IndexVideo(video);
                }
            }
            if (series != null)
            {
                foreach (var s in series)
                {
                    IndexSeries(s);
                }
            }
        }

        public void IndexVideo(Video video)
        {
            if (video == null) return;

            var doc = new SearchDocument
            {
                Id = video.Id,
                PrimaryTitle = video.Title,
                DocumentType = "Movie",
                Price = video.Price,
                ThumbnailUrl = video.ThumbnailUrl,
                BackdropUrl = video.BackdropUrl,
                ReleaseYear = video.ReleaseYear,
                DurationMinutes = video.DurationMinutes,
                QualityBadge = video.QualityBadge,
                AgeRating = video.AgeRating,
                CategoryIds = video.Categories?.Select(c => c.Id).ToList() ?? new List<int>()
            };

            // Base fields
            doc.Titles["en"] = video.Title;
            doc.Descriptions["en"] = video.Description ?? string.Empty;
            doc.Directors["en"] = video.Director ?? string.Empty;
            doc.Casts["en"] = video.Cast ?? string.Empty;

            // Translations
            if (video.Translations != null)
            {
                foreach (var tr in video.Translations)
                {
                    var lang = tr.LanguageCode?.ToLowerInvariant() ?? "en";
                    if (!string.IsNullOrWhiteSpace(tr.Title)) doc.Titles[lang] = tr.Title;
                    if (!string.IsNullOrWhiteSpace(tr.Description)) doc.Descriptions[lang] = tr.Description;
                    if (!string.IsNullOrWhiteSpace(tr.Director)) doc.Directors[lang] = tr.Director;
                    if (!string.IsNullOrWhiteSpace(tr.Cast)) doc.Casts[lang] = tr.Cast;
                }
            }

            // Build weighted tokens from all languages
            doc.IndexedTokens = BuildTokensForDocument(doc, video.Categories, video.Tags);

            _documents[$"Movie_{video.Id}"] = doc;
        }

        public void IndexSeries(Series series)
        {
            if (series == null) return;

            var doc = new SearchDocument
            {
                Id = series.Id,
                PrimaryTitle = series.Name,
                DocumentType = "Series",
                Price = series.Price,
                ThumbnailUrl = series.PosterUrl ?? series.BackdropUrl,
                BackdropUrl = series.BackdropUrl,
                ReleaseYear = series.ReleaseYear,
                QualityBadge = series.QualityBadge,
                AgeRating = series.AgeRating
            };

            // Base fields
            doc.Titles["en"] = series.Name;
            doc.Descriptions["en"] = series.Description ?? string.Empty;
            doc.Directors["en"] = series.Director ?? string.Empty;
            doc.Casts["en"] = series.Cast ?? string.Empty;

            // Translations
            if (series.Translations != null)
            {
                foreach (var tr in series.Translations)
                {
                    var lang = tr.LanguageCode?.ToLowerInvariant() ?? "en";
                    if (!string.IsNullOrWhiteSpace(tr.Name)) doc.Titles[lang] = tr.Name;
                    if (!string.IsNullOrWhiteSpace(tr.Description)) doc.Descriptions[lang] = tr.Description;
                    if (!string.IsNullOrWhiteSpace(tr.Director)) doc.Directors[lang] = tr.Director;
                    if (!string.IsNullOrWhiteSpace(tr.Cast)) doc.Casts[lang] = tr.Cast;
                }
            }

            doc.IndexedTokens = BuildTokensForDocument(doc, null, null);

            _documents[$"Series_{series.Id}"] = doc;
        }

        public void RemoveVideo(int videoId)
        {
            _documents.TryRemove($"Movie_{videoId}", out _);
        }

        public void RemoveSeries(int seriesId)
        {
            _documents.TryRemove($"Series_{seriesId}", out _);
        }

        public SearchResultSet Search(string query, string? lang = "en", string? documentType = null, int? categoryId = null, int limit = 30)
        {
            var sw = Stopwatch.StartNew();
            var resultSet = new SearchResultSet
            {
                Query = query?.Trim() ?? string.Empty
            };

            if (string.IsNullOrWhiteSpace(query))
            {
                // Return all documents of given type/category sorted by Title
                var allDocs = _documents.Values.AsEnumerable();
                if (!string.IsNullOrEmpty(documentType))
                    allDocs = allDocs.Where(d => d.DocumentType.Equals(documentType, StringComparison.OrdinalIgnoreCase));
                if (categoryId.HasValue)
                    allDocs = allDocs.Where(d => d.CategoryIds.Contains(categoryId.Value));

                resultSet.Items = allDocs
                    .Select(d => new SearchResultItem
                    {
                        Id = d.Id,
                        Title = d.GetDisplayTitle(lang),
                        Description = d.GetDisplayDescription(lang),
                        DocumentType = d.DocumentType,
                        Price = d.Price,
                        ThumbnailUrl = d.ThumbnailUrl,
                        BackdropUrl = d.BackdropUrl,
                        ReleaseYear = d.ReleaseYear,
                        DurationMinutes = d.DurationMinutes,
                        QualityBadge = d.QualityBadge,
                        AgeRating = d.AgeRating,
                        Score = 1.0
                    })
                    .Take(limit)
                    .ToList();

                sw.Stop();
                resultSet.ElapsedMilliseconds = sw.Elapsed.TotalMilliseconds;
                return resultSet;
            }

            var searchTerms = TokenSplitRegex.Split(query.Trim().ToLowerInvariant())
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .ToList();

            if (searchTerms.Count == 0)
            {
                sw.Stop();
                resultSet.ElapsedMilliseconds = sw.Elapsed.TotalMilliseconds;
                return resultSet;
            }

            var scoredDocs = new List<(SearchDocument Doc, double TotalScore, string BestMatchedField, string? ClosestTitleSuggestion)>();

            foreach (var doc in _documents.Values)
            {
                if (!string.IsNullOrEmpty(documentType) && !doc.DocumentType.Equals(documentType, StringComparison.OrdinalIgnoreCase))
                    continue;

                if (categoryId.HasValue && !doc.CategoryIds.Contains(categoryId.Value))
                    continue;

                double docScore = 0;
                int matchedTermsCount = 0;
                string bestField = string.Empty;
                double maxFieldScore = 0;
                string? candidateTitleSuggestion = null;
                double bestTitleSim = 0;

                foreach (var term in searchTerms)
                {
                    double bestTermScore = 0;
                    string bestTermField = string.Empty;

                    foreach (var indexedToken in doc.IndexedTokens)
                    {
                        double sim = WeightedDamerauLevenshtein.CalculateSimilarity(term, indexedToken.Token);
                        
                        // Keep track of close title matches for "Did You Mean"
                        if (indexedToken.FieldName == "Title" && sim > bestTitleSim)
                        {
                            bestTitleSim = sim;
                            if (sim >= 0.75 && sim < 1.0)
                            {
                                candidateTitleSuggestion = doc.GetDisplayTitle(lang);
                            }
                        }

                        if (sim >= 0.65) // Meaningful match threshold
                        {
                            double termScore = sim * indexedToken.FieldWeight;
                            if (termScore > bestTermScore)
                            {
                                bestTermScore = termScore;
                                bestTermField = indexedToken.FieldName;
                            }
                        }
                    }

                    if (bestTermScore > 0)
                    {
                        docScore += bestTermScore;
                        matchedTermsCount++;
                        if (bestTermScore > maxFieldScore)
                        {
                            maxFieldScore = bestTermScore;
                            bestField = bestTermField;
                        }
                    }
                }

                // If at least one term matched
                if (matchedTermsCount > 0)
                {
                    // Full query coverage bonus: bonus if all terms matched
                    double coverageMultiplier = (double)matchedTermsCount / searchTerms.Count;
                    double finalScore = docScore * (1.0 + (coverageMultiplier * 0.5));

                    scoredDocs.Add((doc, finalScore, bestField, candidateTitleSuggestion));
                }
            }

            // Order by highest score
            var sorted = scoredDocs
                .OrderByDescending(x => x.TotalScore)
                .Take(limit)
                .ToList();

            // Set Did You Mean suggestion if top result was a fuzzy typo match
            if (sorted.Count > 0 && !string.IsNullOrEmpty(sorted[0].ClosestTitleSuggestion))
            {
                resultSet.DidYouMeanSuggestion = sorted[0].ClosestTitleSuggestion;
            }

            resultSet.Items = sorted.Select(x => new SearchResultItem
            {
                Id = x.Doc.Id,
                Title = x.Doc.GetDisplayTitle(lang),
                Description = x.Doc.GetDisplayDescription(lang),
                DocumentType = x.Doc.DocumentType,
                Price = x.Doc.Price,
                ThumbnailUrl = x.Doc.ThumbnailUrl,
                BackdropUrl = x.Doc.BackdropUrl,
                ReleaseYear = x.Doc.ReleaseYear,
                DurationMinutes = x.Doc.DurationMinutes,
                QualityBadge = x.Doc.QualityBadge,
                AgeRating = x.Doc.AgeRating,
                Score = Math.Round(x.TotalScore, 2),
                MatchedField = x.BestMatchedField
            }).ToList();

            sw.Stop();
            resultSet.ElapsedMilliseconds = sw.Elapsed.TotalMilliseconds;
            return resultSet;
        }

        private static List<IndexedFieldToken> BuildTokensForDocument(SearchDocument doc, IEnumerable<Category>? categories, IEnumerable<Tag>? tags)
        {
            var tokens = new List<IndexedFieldToken>();

            void AddTokens(string text, double weight, string fieldName, string lang)
            {
                if (string.IsNullOrWhiteSpace(text)) return;
                var words = TokenSplitRegex.Split(text.Trim().ToLowerInvariant());
                foreach (var w in words)
                {
                    if (w.Length >= 2)
                    {
                        tokens.Add(new IndexedFieldToken
                        {
                            Token = w,
                            FieldWeight = weight,
                            FieldName = fieldName,
                            LanguageCode = lang
                        });
                    }
                }
            }

            // Titles (Weight: 3.5)
            foreach (var (lang, title) in doc.Titles)
            {
                AddTokens(title, 3.5, "Title", lang);
            }

            // Directors & Cast (Weight: 2.0)
            foreach (var (lang, director) in doc.Directors)
            {
                AddTokens(director, 2.0, "Director", lang);
            }
            foreach (var (lang, cast) in doc.Casts)
            {
                AddTokens(cast, 2.0, "Cast", lang);
            }

            // Categories (Weight: 1.5)
            if (categories != null)
            {
                foreach (var cat in categories)
                {
                    AddTokens(cat.Name, 1.5, "Category", "en");
                    if (cat.Translations != null)
                    {
                        foreach (var tr in cat.Translations)
                        {
                            AddTokens(tr.Name, 1.5, "Category", tr.LanguageCode);
                        }
                    }
                }
            }

            // Tags (Weight: 1.5)
            if (tags != null)
            {
                foreach (var tag in tags)
                {
                    AddTokens(tag.Name, 1.5, "Tag", "en");
                    if (tag.Translations != null)
                    {
                        foreach (var tr in tag.Translations)
                        {
                            AddTokens(tr.Name, 1.5, "Tag", tr.LanguageCode);
                        }
                    }
                }
            }

            // Descriptions (Weight: 1.0)
            foreach (var (lang, desc) in doc.Descriptions)
            {
                AddTokens(desc, 1.0, "Description", lang);
            }

            return tokens;
        }
    }
}
