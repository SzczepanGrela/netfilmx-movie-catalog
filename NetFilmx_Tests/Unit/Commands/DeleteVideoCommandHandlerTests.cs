using FluentAssertions;
using Moq;
using NetFilmx_Service.Command.Video;
using NetFilmx_Service.Storage;
using NetFilmx_Storage.Entities;
using NetFilmx_Storage.Repositories;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace NetFilmx_Tests.Unit.Commands
{
    public class DeleteVideoCommandHandlerTests
    {
        private readonly Mock<IVideoRepository> _mockRepository;
        private readonly Mock<ICloudStorageService> _mockCloudStorage;
        private readonly Mock<NetFilmx_Service.Search.ISearchEngine> _mockSearchEngine;
        private readonly DeleteVideoCommandHandler _handler;

        public DeleteVideoCommandHandlerTests()
        {
            _mockRepository = new Mock<IVideoRepository>();
            _mockCloudStorage = new Mock<ICloudStorageService>();
            _mockSearchEngine = new Mock<NetFilmx_Service.Search.ISearchEngine>();
            _handler = new DeleteVideoCommandHandler(_mockRepository.Object, _mockCloudStorage.Object, _mockSearchEngine.Object);
        }

        [Fact]
        public async Task Handle_WithValidCommand_ShouldDeleteVideoAndStorageFiles()
        {
            // Arrange
            int videoId = 1;
            var command = new DeleteVideoCommand(videoId);
            var video = new Video("Test Video", "Description", 10m, "https://netfilmx.dev/videos/1/hls/master.m3u8", "https://netfilmx.dev/thumbnails/thumb1.jpg");
            video.BackdropUrl = "https://netfilmx.dev/backdrops/back1.png";
            
            _mockRepository.Setup(r => r.GetVideoByIdAsync(videoId)).ReturnsAsync((Video?)video);
            _mockRepository.Setup(r => r.DeleteVideoAsync(videoId)).Returns(Task.CompletedTask);

            // Act
            var result = await _handler.Handle(command, CancellationToken.None);

            // Assert
            result.IsSuccess.Should().BeTrue();
            _mockCloudStorage.Verify(c => c.DeleteFileAsync(It.Is<string>(s => s.Contains("thumbnails/thumb1.jpg"))), Times.Once);
            _mockCloudStorage.Verify(c => c.DeleteFileAsync(It.Is<string>(s => s.Contains("backdrops/back1.png"))), Times.Once);
            _mockCloudStorage.Verify(c => c.DeleteDirectoryAsync($"videos/{videoId}/hls"), Times.Once);
            _mockCloudStorage.Verify(c => c.DeleteDirectoryAsync($"videos/{videoId}/"), Times.Once);
            _mockRepository.Verify(r => r.DeleteVideoAsync(videoId), Times.Once);
        }

        [Fact]
        public async Task Handle_WhenVideoNotFound_ShouldStillTryToDeleteFromRepository()
        {
            // Arrange
            int videoId = 99;
            var command = new DeleteVideoCommand(videoId);
            
            _mockRepository.Setup(r => r.GetVideoByIdAsync(videoId)).ReturnsAsync((Video?)null);

            // Act
            var result = await _handler.Handle(command, CancellationToken.None);

            // Assert
            result.IsSuccess.Should().BeTrue();
            _mockCloudStorage.Verify(c => c.DeleteFileAsync(It.IsAny<string>()), Times.Never);
            _mockCloudStorage.Verify(c => c.DeleteDirectoryAsync(It.IsAny<string>()), Times.Never);
            _mockRepository.Verify(r => r.DeleteVideoAsync(videoId), Times.Once);
        }

        [Fact]
        public async Task Handle_WhenStorageThrowsException_ShouldCatchAndStillDeleteFromRepository()
        {
            // Arrange - simulate Cloudflare R2 throwing an error (e.g. network failure or bad credentials)
            int videoId = 5;
            var command = new DeleteVideoCommand(videoId);
            var video = new Video("Broken Storage Video", "Desc", 10m, "videos/5/hls/master.m3u8", "thumbnails/thumb.jpg");

            _mockRepository.Setup(r => r.GetVideoByIdAsync(videoId)).ReturnsAsync((Video?)video);
            _mockCloudStorage.Setup(c => c.DeleteFileAsync(It.IsAny<string>()))
                .ThrowsAsync(new System.IO.IOException("R2 network error"));
            _mockCloudStorage.Setup(c => c.DeleteDirectoryAsync(It.IsAny<string>()))
                .ThrowsAsync(new System.IO.IOException("R2 network error"));
            _mockRepository.Setup(r => r.DeleteVideoAsync(videoId)).Returns(Task.CompletedTask);

            // Act
            var result = await _handler.Handle(command, CancellationToken.None);

            // Assert - operation must still succeed and delete from database
            result.IsSuccess.Should().BeTrue();
            _mockRepository.Verify(r => r.DeleteVideoAsync(videoId), Times.Once);
        }
    }
}
