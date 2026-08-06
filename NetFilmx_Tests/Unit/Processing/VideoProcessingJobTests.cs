using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using NetFilmx_Service.Processing;
using NetFilmx_Service.Storage;
using NetFilmx_Storage.Entities;
using NetFilmx_Tests.Helpers;
using System.Threading.Tasks;
using Xunit;

namespace NetFilmx_Tests.Unit.Processing
{
    public class VideoProcessingJobTests
    {
        [Fact]
        public async Task ProcessVideoAsync_ShouldUploadAndSetUrl_WhenFfmpegSucceeds()
        {
            // Arrange
            var dbContext = TestDbContextFactory.Create();
            var video = new Video("Test", "Desc", 10, "processing", "thumb");
            dbContext.Videos.Add(video);
            await dbContext.SaveChangesAsync();

            var loggerMock = new Mock<ILogger<VideoProcessingJob>>();
            var storageMock = new Mock<ICloudStorageService>();
            var ffmpegMock = new Mock<IFFmpegService>();

            ffmpegMock.Setup(f => f.RunFFmpegHls(It.IsAny<string>(), It.IsAny<string>())).Returns(true);

            var job = new VideoProcessingJob(loggerMock.Object, storageMock.Object, dbContext, ffmpegMock.Object);

            // Act
            await job.ProcessVideoAsync(video.Id, "dummy_path.mp4");

            // Assert
            var updatedVideo = await dbContext.Videos.FindAsync(video.Id);
            updatedVideo.Should().NotBeNull();
            updatedVideo!.VideoUrl.Should().Contain("master.m3u8");

            storageMock.Verify(s => s.UploadDirectoryAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        }

        [Fact]
        public async Task ProcessVideoAsync_ShouldSetFailed_WhenFfmpegFails()
        {
            // Arrange
            var dbContext = TestDbContextFactory.Create();
            var video = new Video("Test", "Desc", 10, "processing", "thumb");
            dbContext.Videos.Add(video);
            await dbContext.SaveChangesAsync();

            var loggerMock = new Mock<ILogger<VideoProcessingJob>>();
            var storageMock = new Mock<ICloudStorageService>();
            var ffmpegMock = new Mock<IFFmpegService>();

            ffmpegMock.Setup(f => f.RunFFmpegHls(It.IsAny<string>(), It.IsAny<string>())).Returns(false); // Simulate failure

            var job = new VideoProcessingJob(loggerMock.Object, storageMock.Object, dbContext, ffmpegMock.Object);

            // Act
            await job.ProcessVideoAsync(video.Id, "dummy_path.mp4");

            // Assert
            var updatedVideo = await dbContext.Videos.FindAsync(video.Id);
            updatedVideo.Should().NotBeNull();
            updatedVideo!.VideoUrl.Should().Be("FAILED");

            storageMock.Verify(s => s.UploadDirectoryAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }
    }
}
