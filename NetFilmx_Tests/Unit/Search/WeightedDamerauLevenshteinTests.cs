using FluentAssertions;
using NetFilmx_Service.Search;
using Xunit;

namespace NetFilmx_Tests.Unit.Search
{
    public class WeightedDamerauLevenshteinTests
    {
        [Fact]
        public void CalculateSimilarity_ExactMatch_ShouldReturnOne()
        {
            var sim = WeightedDamerauLevenshtein.CalculateSimilarity("sintel", "sintel");
            sim.Should().Be(1.0);
        }

        [Fact]
        public void CalculateSimilarity_PhysicalMissclick_ShouldHaveHighSimilarity()
        {
            // 'd' is next to 's' on QWERTY -> "dintel" vs "sintel"
            var simMissclick = WeightedDamerauLevenshtein.CalculateSimilarity("dintel", "sintel");
            
            // 'p' is far from 's' -> "pintel" vs "sintel"
            var simDistant = WeightedDamerauLevenshtein.CalculateSimilarity("pintel", "sintel");

            simMissclick.Should().BeGreaterThan(0.90, "a neighbor key missclick should retain high similarity");
            simMissclick.Should().BeGreaterThan(simDistant, "neighbor key slip should rank higher than distant typo");
        }

        [Fact]
        public void CalculateSimilarity_Transposition_ShouldHaveHighSimilarity()
        {
            // "snitel" vs "sintel" (swapped adjacent n and i)
            var sim = WeightedDamerauLevenshtein.CalculateSimilarity("snitel", "sintel");
            sim.Should().BeGreaterThan(0.85, "transposition of adjacent characters is a common typo");
        }

        [Fact]
        public void CalculateSimilarity_PrefixMatch_ShouldHaveHighSimilarity()
        {
            // user typing prefix "sin" for "sintel"
            var sim = WeightedDamerauLevenshtein.CalculateSimilarity("sin", "sintel");
            sim.Should().BeGreaterThanOrEqualTo(0.90, "prefix search should receive search-as-you-type boost");
        }

        [Fact]
        public void CalculateSimilarity_PolishDiacriticsMissing_ShouldMatchAccurately()
        {
            // "lzy" vs "łzy"
            var sim = WeightedDamerauLevenshtein.CalculateSimilarity("lzy", "łzy");
            sim.Should().BeGreaterThan(0.95);
        }
    }
}
