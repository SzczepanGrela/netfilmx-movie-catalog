using FluentAssertions;
using MediatR;
using NetFilmx_Service.Command.Video;
using System.Linq;
using Xunit;

namespace NetFilmx_Tests.Unit.Validators
{
    public class AddVideoCommandValidatorTests
    {
        [Theory]
        [InlineData("", "Valid description", 10.0, "http://url.com", "http://thumb.com", "Title cannot be empty")]
        [InlineData("Valid Title", "", 10.0, "http://url.com", "http://thumb.com", "Description cannot be empty")]
        [InlineData("Valid Title", "Valid description", -1.0, "http://url.com", "http://thumb.com", "Price cannot be lower than 0")]
        public void Should_Fail_Validation_When_Fields_Are_Invalid(string title, string description, decimal price, string url, string thumb, string expectedError)
        {
            // Arrange
            var validator = new AddVideoCommandValidator();
            var command = new AddVideoCommand(title, description, price, url, thumb);

            // Act
            var result = validator.Validate(command);

            // Assert
            result.IsValid.Should().BeFalse();
            result.Errors.Should().Contain(e => e.ErrorMessage == expectedError);
        }

        [Fact]
        public void Should_Pass_Validation_When_All_Fields_Are_Valid()
        {
            // Arrange
            var validator = new AddVideoCommandValidator();
            var command = new AddVideoCommand("My Title", "My Description", 9.99m, "http://video.mp4", "http://thumb.jpg");

            // Act
            var result = validator.Validate(command);

            // Assert
            result.IsValid.Should().BeTrue();
        }
    }
}
