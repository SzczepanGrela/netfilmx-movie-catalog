using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NetFilmx_Service.Command.Video;
using NetFilmx_Tests.Helpers;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace NetFilmx_Tests.Unit.Commands
{
    public class AddVideoCommandHandlerTests
    {
        [Fact]
        public async Task Handle_ShouldAddVideoToDatabase_AndReturnSuccessResult()
        {
            // Arrange
            var dbContext = TestDbContextFactory.Create();
            var repository = new NetFilmx_Storage.Repositories.VideoRepository(dbContext);
            var handler = new AddVideoCommandHandler(repository);
            var command = new AddVideoCommand("Interstellar", "Space movie", 15.99m, "http://video.url", "http://thumb.url");

            // Act
            var result = await handler.Handle(command, CancellationToken.None);

            // Assert
            result.IsSuccess.Should().BeTrue();
            result.Data.Should().BeGreaterThan(0); // Should return new Id

            var videoInDb = await dbContext.Videos.FirstOrDefaultAsync(v => v.Id == result.Data);
            videoInDb.Should().NotBeNull();
            videoInDb!.Title.Should().Be("Interstellar");
            videoInDb.Price.Should().Be(15.99m);
        }
    }
}
