using FluentAssertions;
using NetFilmx_Service.Search;
using NetFilmx_Storage.Entities;
using System.Collections.Generic;
using Xunit;

namespace NetFilmx_Tests.Unit.Search
{
    public class QwertySearchEngineTests
    {
        private readonly ISearchEngine _engine;

        public QwertySearchEngineTests()
        {
            _engine = new QwertySearchEngine();

            var v1 = new Video("Sintel", "A lonely warrior searches for her stolen dragon.", 14.99m, "https://test.m3u8", "sintel.jpg")
            {
                Id = 1,
                Director = "Colin Levy",
                Cast = "Halina Reijn, Thom Hoffman",
                QualityBadge = "4K",
                Categories = new List<Category> { new Category("Animation", "3D Animation") { Id = 1 } }
            };
            v1.Translations.Add(new VideoTranslation(1, "en", "Sintel", "A lonely warrior searches for her dragon.", "Colin Levy", "Halina Reijn"));
            v1.Translations.Add(new VideoTranslation(1, "pl", "Sintel", "Samotna wojowniczka szuka porwanego smoka.", "Colin Levy", "Halina Reijn"));

            var v2 = new Video("Tears of Steel", "Warriors in Amsterdam fight robotic invaders.", 15.99m, "https://test2.m3u8", "tears.jpg")
            {
                Id = 2,
                Director = "Ian Hubert",
                Cast = "Derek de Lint",
                QualityBadge = "4K",
                Categories = new List<Category> { new Category("Sci-Fi", "Science Fiction") { Id = 2 } }
            };
            v2.Translations.Add(new VideoTranslation(2, "en", "Tears of Steel", "Warriors fight robotic invaders.", "Ian Hubert", "Derek de Lint"));
            v2.Translations.Add(new VideoTranslation(2, "pl", "Łzy ze stali", "Grupa wojowników walczy z robotami w Amsterdamie.", "Ian Hubert", "Derek de Lint"));

            var v3 = new Video("Charge", "A veteran fights cyborgs for a power battery.", 9.99m, "https://test3.m3u8", "charge.jpg")
            {
                Id = 3,
                Director = "Hjalti Hjalmarsson",
                QualityBadge = "HD",
                Categories = new List<Category> { new Category("Action", "Action movies") { Id = 3 } }
            };

            var s1 = new Series("Caminandes", 9.99m, "Patagonia llama adventures")
            {
                Id = 1
            };
            s1.Translations.Add(new SeriesTranslation(1, "en", "Caminandes", "Adventures of Koro the llama."));
            s1.Translations.Add(new SeriesTranslation(1, "pl", "Caminandes", "Przygody sympatycznej lamy Koro."));

            _engine.Warmup(new[] { v1, v2, v3 }, new[] { s1 });
        }

        [Fact]
        public void Search_ExactTitle_ShouldReturnHighestScore()
        {
            var results = _engine.Search("Sintel", "en");
            results.Items.Should().NotBeEmpty();
            results.Items[0].Id.Should().Be(1);
            results.Items[0].Title.Should().Be("Sintel");
        }

        [Fact]
        public void Search_MissclickTypo_ShouldFindMovieAndSuggestDidYouMean()
        {
            // "dintel" has 'd' next to 's' on QWERTY
            var results = _engine.Search("dintel", "en");
            results.Items.Should().NotBeEmpty();
            results.Items[0].Id.Should().Be(1);
            results.DidYouMeanSuggestion.Should().Be("Sintel");
        }

        [Fact]
        public void Search_MultiLingualQuery_ShouldMatchBothEnglishAndPolish()
        {
            // Searching in Polish for "smoka" (from Polish description)
            var polishResults = _engine.Search("smoka", "pl");
            polishResults.Items.Should().NotBeEmpty();
            polishResults.Items[0].Id.Should().Be(1);
            polishResults.Items[0].Title.Should().Be("Sintel");

            // Searching in Polish for "robotami" (from Polish description of Tears of Steel)
            var tearsResults = _engine.Search("robotami", "pl");
            tearsResults.Items.Should().NotBeEmpty();
            tearsResults.Items[0].Id.Should().Be(2);
            tearsResults.Items[0].Title.Should().Be("Łzy ze stali");
        }

        [Fact]
        public void Search_ByDirectorOrCast_ShouldMatch()
        {
            var results = _engine.Search("Colin Levy", "en");
            results.Items.Should().NotBeEmpty();
            results.Items[0].Id.Should().Be(1);
        }

        [Fact]
        public void Search_CategoryFilter_ShouldFilterProperly()
        {
            var results = _engine.Search("", "en", documentType: "Movie", categoryId: 2);
            results.Items.Should().HaveCount(1);
            results.Items[0].Id.Should().Be(2); // Tears of Steel (Sci-Fi category ID 2)
        }

        [Fact]
        public void Search_SeriesDocumentType_ShouldReturnOnlySeries()
        {
            var results = _engine.Search("Caminandes", "en", documentType: "Series");
            results.Items.Should().HaveCount(1);
            results.Items[0].DocumentType.Should().Be("Series");
        }
    }
}
