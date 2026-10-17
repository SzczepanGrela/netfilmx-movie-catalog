using Moq;
using NetFilmx_Service.Command.Video;
using NetFilmx_Service.Search;
using NetFilmx_Storage.Entities;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Tests.Unit.Handlers;

public class VideoMediaEditTests
{
    [Theory]
    [InlineData("https://media.example.test/retained/film.mp4")]
    [InlineData("https://media.example.test/uploads/videos/random/master.m3u8")]
    public async Task Edit_PreservesCompleteMediaReference(string url)
    {
        var video = new Video("Original", "Description", 1, url, "https://media.example.test/poster.jpg");
        var repository = new Mock<IVideoRepository>();
        repository.Setup(r => r.GetVideoByIdAsync(1)).ReturnsAsync(video);
        var handler = new EditVideoCommandHandler(repository.Object, Mock.Of<ISearchEngine>());
        var result = await handler.Handle(new EditVideoCommand(1, "Changed", "Description", 1, url, video.ThumbnailUrl), default);
        Assert.True(result.IsSuccess); Assert.Equal(url, video.VideoUrl); Assert.Equal("Changed", video.Title);
        repository.Verify(r => r.UpdateVideoAsync(video), Times.Once);
    }

    [Fact]
    public async Task CompletedUpload_RejectsStaleProcessingForm()
    {
        var url = "https://media.example.test/uploads/videos/random/master.m3u8";
        var video = new Video("Original", "Description", 1, url, "https://media.example.test/poster.jpg")
            { SourceUploadId = Guid.NewGuid().ToString("N") };
        var repository = new Mock<IVideoRepository>();
        repository.Setup(r => r.GetVideoByIdAsync(1)).ReturnsAsync(video);
        var handler = new EditVideoCommandHandler(repository.Object, Mock.Of<ISearchEngine>());
        var result = await handler.Handle(new EditVideoCommand(1, "Changed", "Description", 1, "PROCESSING", video.ThumbnailUrl), default);
        Assert.True(result.IsFailure); Assert.Equal(url, video.VideoUrl); Assert.Equal("Original", video.Title);
        repository.Verify(r => r.UpdateVideoAsync(It.IsAny<Video>()), Times.Never);
    }
}
