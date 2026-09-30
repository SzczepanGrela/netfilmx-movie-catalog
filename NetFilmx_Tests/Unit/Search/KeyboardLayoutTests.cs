using FluentAssertions;
using NetFilmx_Service.Search;
using Xunit;

namespace NetFilmx_Tests.Unit.Search
{
    public class KeyboardLayoutTests
    {
        [Fact]
        public void GetSubstitutionCost_SameCharacters_ShouldReturnZero()
        {
            KeyboardLayout.GetSubstitutionCost('a', 'a').Should().Be(0.0);
            KeyboardLayout.GetSubstitutionCost('Z', 'z').Should().Be(0.0);
            KeyboardLayout.GetSubstitutionCost('5', '5').Should().Be(0.0);
        }

        [Theory]
        [InlineData('s', 'd')] // Horizontal neighbours on row 2
        [InlineData('a', 's')] // Horizontal neighbours on row 2
        [InlineData('w', 'e')] // Horizontal neighbours on row 1
        [InlineData('t', 'y')] // Horizontal neighbours on row 1
        [InlineData('o', 'p')] // Horizontal neighbours on row 1
        [InlineData('w', 's')] // Vertical neighbours (row 1 to row 2)
        public void GetSubstitutionCost_ImmediateNeighbours_ShouldHaveLowPenalty(char c1, char c2)
        {
            var cost = KeyboardLayout.GetSubstitutionCost(c1, c2);
            cost.Should().BeLessThanOrEqualTo(0.30, "neighbour keys represent physical finger slips");
        }

        [Theory]
        [InlineData('q', 'p')] // Opposite sides of row 1
        [InlineData('z', 'p')] // Bottom left to top right
        [InlineData('a', 'l')] // Left to right of row 2
        public void GetSubstitutionCost_DistantKeys_ShouldHaveFullPenalty(char c1, char c2)
        {
            var cost = KeyboardLayout.GetSubstitutionCost(c1, c2);
            cost.Should().Be(1.0, "distant keys have no physical proximity bonus");
        }

        [Theory]
        [InlineData('ą', 'a')]
        [InlineData('ę', 'e')]
        [InlineData('ł', 'l')]
        [InlineData('ś', 's')]
        [InlineData('ć', 'c')]
        [InlineData('ź', 'z')]
        public void GetSubstitutionCost_MissingPolishDiacritic_ShouldHaveMinimalPenalty(char diacritic, char baseChar)
        {
            var cost = KeyboardLayout.GetSubstitutionCost(diacritic, baseChar);
            cost.Should().Be(0.10, "omitted Alt key for Polish letters should have minimal penalty");
        }
    }
}
