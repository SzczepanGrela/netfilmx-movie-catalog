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
        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public async Task Source_IsRemovedOnlyAfterSuccessfulUploadAndDatabaseSave(bool uploadSucceeds)
        {
            await using var dbContext = TestDbContextFactory.Create();
            var video = new Video("Test", "Desc", 10, "PROCESSING", "thumb");
            dbContext.Videos.Add(video);
            await dbContext.SaveChangesAsync();
            var input = System.IO.Path.GetTempFileName();
            try
            {
                var storage = new Mock<ICloudStorageService>();
                storage.Setup(s => s.IsConfigured).Returns(true);
                var upload = storage.Setup(s => s.UploadHlsAsync(It.IsAny<string>()));
                if (uploadSucceeds)
                    upload.ReturnsAsync("https://media.example.test/uploads/videos/unique/hls/master.m3u8");
                else
                    upload.ThrowsAsync(new System.IO.IOException("Upload failed"));
                var ffmpeg = new Mock<IFFmpegService>();
                ffmpeg.Setup(f => f.RunFFmpegHls(input, It.IsAny<string>())).Returns(true);
                var job = new VideoProcessingJob(Mock.Of<ILogger<VideoProcessingJob>>(), storage.Object, dbContext, ffmpeg.Object);

                var act = () => job.ProcessVideoAsync(video.Id, input);
                if (uploadSucceeds)
                    await act();
                else
                    await act.Should().ThrowAsync<System.IO.IOException>();

                System.IO.File.Exists(input).Should().Be(!uploadSucceeds);
                video.VideoUrl.Should().Be(uploadSucceeds
                    ? "https://media.example.test/uploads/videos/unique/hls/master.m3u8"
                    : "FAILED");
            }
            finally
            {
                System.IO.File.Delete(input);
            }
        }

        [Fact]
        public async Task ProcessVideoAsync_ShouldUploadAndSetUrl_WhenFfmpegSucceedsAndR2Configured()
        {
            // Arrange
            var dbContext = TestDbContextFactory.Create();
            var video = new Video("Test", "Desc", 10, "processing", "thumb");
            dbContext.Videos.Add(video);
            await dbContext.SaveChangesAsync();

            var loggerMock = new Mock<ILogger<VideoProcessingJob>>();
            var storageMock = new Mock<ICloudStorageService>();
            storageMock.Setup(s => s.IsConfigured).Returns(true);
            storageMock.Setup(s => s.UploadHlsAsync(It.IsAny<string>()))
                .ReturnsAsync("https://media.example.test/uploads/videos/unique/hls/master.m3u8");

            var ffmpegMock = new Mock<IFFmpegService>();
            ffmpegMock.Setup(f => f.RunFFmpegHls(It.IsAny<string>(), It.IsAny<string>())).Returns(true);

            var job = new VideoProcessingJob(loggerMock.Object, storageMock.Object, dbContext, ffmpegMock.Object);

            // Act
            await job.ProcessVideoAsync(video.Id, "dummy_path.mp4");

            // Assert
            var updatedVideo = await dbContext.Videos.FindAsync(video.Id);
            updatedVideo.Should().NotBeNull();
            updatedVideo!.VideoUrl.Should().Be("https://media.example.test/uploads/videos/unique/hls/master.m3u8");

            storageMock.Verify(s => s.UploadHlsAsync(It.IsAny<string>()), Times.Once);
        }

        [Fact]
        public async Task ProcessVideoAsync_ShouldRefuseConversion_WhenR2NotConfigured()
        {
            // Arrange
            var dbContext = TestDbContextFactory.Create();
            var video = new Video("Test Local", "Desc", 10, "processing", "thumb");
            dbContext.Videos.Add(video);
            await dbContext.SaveChangesAsync();

            var loggerMock = new Mock<ILogger<VideoProcessingJob>>();
            var storageMock = new Mock<ICloudStorageService>();
            storageMock.Setup(s => s.IsConfigured).Returns(false);

            var ffmpegMock = new Mock<IFFmpegService>();
            ffmpegMock.Setup(f => f.RunFFmpegHls(It.IsAny<string>(), It.IsAny<string>())).Returns(true);

            var job = new VideoProcessingJob(loggerMock.Object, storageMock.Object, dbContext, ffmpegMock.Object);

            // Act: missing credentials must not produce a fake URL or ephemeral local fallback.
            var act = () => job.ProcessVideoAsync(video.Id, "dummy_path.mp4");
            await act.Should().ThrowAsync<System.InvalidOperationException>();

            var updatedVideo = await dbContext.Videos.FindAsync(video.Id);
            updatedVideo!.VideoUrl.Should().Be("FAILED");
            ffmpegMock.Verify(f => f.RunFFmpegHls(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            storageMock.Verify(s => s.UploadHlsAsync(It.IsAny<string>()), Times.Never);
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
            storageMock.Setup(s => s.IsConfigured).Returns(true);
            var ffmpegMock = new Mock<IFFmpegService>();

            ffmpegMock.Setup(f => f.RunFFmpegHls(It.IsAny<string>(), It.IsAny<string>())).Returns(false); // Simulate failure

            var job = new VideoProcessingJob(loggerMock.Object, storageMock.Object, dbContext, ffmpegMock.Object);

            // Act
            await job.ProcessVideoAsync(video.Id, "dummy_path.mp4");

            // Assert
            var updatedVideo = await dbContext.Videos.FindAsync(video.Id);
            updatedVideo.Should().NotBeNull();
            updatedVideo!.VideoUrl.Should().Be("FAILED");

            storageMock.Verify(s => s.UploadHlsAsync(It.IsAny<string>()), Times.Never);
        }
    }
}
