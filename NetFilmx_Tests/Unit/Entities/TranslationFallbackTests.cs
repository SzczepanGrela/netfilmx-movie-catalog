using FluentAssertions;
using NetFilmx_Storage.Entities;
using Xunit;

namespace NetFilmx_Tests.Unit.Entities
{
    public class TranslationFallbackTests
    {
        [Fact]
        public void Video_GetLocalizedTitle_ShouldReturnPolishWhenPresent()
        {
            var video = new Video("Default English Title", "Default English Desc", 10m, "url", "thumb");
            video.Translations.Add(new VideoTranslation(1, "en", "English Title", "English Desc"));
            video.Translations.Add(new VideoTranslation(1, "pl", "Polski Tytuł", "Polski Opis"));

            video.GetLocalizedTitle("pl").Should().Be("Polski Tytuł");
            video.GetLocalizedDescription("pl").Should().Be("Polski Opis");
        }

        [Fact]
        public void Video_GetLocalizedTitle_ShouldFallbackToEnglishWhenPolishIsMissing()
        {
            var video = new Video("Default English Title", "Default English Desc", 10m, "url", "thumb");
            video.Translations.Add(new VideoTranslation(1, "en", "English Title Only", "English Desc Only"));

            // Requesting "pl" when only "en" exists
            video.GetLocalizedTitle("pl").Should().Be("English Title Only");
            video.GetLocalizedDescription("pl").Should().Be("English Desc Only");
        }

        [Fact]
        public void Video_GetLocalizedTitle_ShouldFallbackToBasePropertyWhenNoTranslationsExist()
        {
            var video = new Video("Base Title", "Base Desc", 10m, "url", "thumb");

            video.GetLocalizedTitle("pl").Should().Be("Base Title");
            video.GetLocalizedDescription("pl").Should().Be("Base Desc");
        }

        [Fact]
        public void Series_GetLocalizedName_ShouldReturnPolishWhenPresent()
        {
            var series = new Series("Base Series", 9.99m, "Base Desc");
            series.Translations.Add(new SeriesTranslation(1, "en", "English Series", "English Series Desc"));
            series.Translations.Add(new SeriesTranslation(1, "pl", "Polska Seria", "Polski Opis Serii"));

            series.GetLocalizedName("pl").Should().Be("Polska Seria");
            series.GetLocalizedDescription("pl").Should().Be("Polski Opis Serii");
        }

        [Fact]
        public void Category_GetLocalizedName_ShouldReturnPolishWhenPresent()
        {
            var cat = new Category("Action", "Action Description");
            cat.Translations.Add(new CategoryTranslation(1, "en", "Action", "Action Description"));
            cat.Translations.Add(new CategoryTranslation(1, "pl", "Akcja", "Opis Akcji"));

            cat.GetLocalizedName("pl").Should().Be("Akcja");
            cat.GetLocalizedDescription("pl").Should().Be("Opis Akcji");
        }
    }
}
