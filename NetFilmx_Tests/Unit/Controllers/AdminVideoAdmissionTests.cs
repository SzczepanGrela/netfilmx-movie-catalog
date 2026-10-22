using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.Extensions.Configuration;
using Moq;
using NetFilmx_Service.Command.Video;
using NetFilmx_Service.Dtos.Video;
using NetFilmx_Service.Result;
using NetFilmx_Service.Search;
using NetFilmx_Service.Storage;
using NetFilmx_Tests.Helpers;
using NetFilmx_Web.Areas.Admin.Controllers;
using NetFilmx_Web.Security;

namespace NetFilmx_Tests.Unit.Controllers;

public class AdminVideoAdmissionTests
{
    [Theory]
    [InlineData("PROCESSING", true)]
    [InlineData("FAILED", true)]
    [InlineData("PROCESSING", false)]
    public async Task PendingStatus_CanOnlyBePreservedForExistingUploadIntent(string status, bool hasIntent)
    {
        using var db = TestDbContextFactory.Create();
        var video = new NetFilmx_Storage.Entities.Video("Original", "Description", 1, status, "https://media.example.test/poster.jpg")
            { SourceUploadId = hasIntent ? Guid.NewGuid().ToString("N") : null };
        db.Videos.Add(video); await db.SaveChangesAsync();
        var mediator = new Mock<IMediator>();
        mediator.Setup(m => m.Send(It.IsAny<EditVideoCommand>(), default)).ReturnsAsync(CResult.Ok());
        var policy = new MediaReferencePolicy(new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["CloudflareR2:PublicUrl"] = "https://media.example.test" }).Build());
        var controller = new VideoController(mediator.Object, Mock.Of<ICloudStorageService>(),
            new NetFilmx_Service.Processing.UploadStagingStore(false, null), db, Mock.Of<ISearchEngine>(), policy);
        var context = new DefaultHttpContext();
        controller.ControllerContext = new ControllerContext { HttpContext = context };
        controller.TempData = new TempDataDictionary(context, Mock.Of<ITempDataProvider>());
        var result = await controller.Edit(new VideoEditDto(video.Id, "Changed", status, video.ThumbnailUrl, "Description", 1));
        if (hasIntent) Assert.IsType<RedirectToActionResult>(result);
        else { Assert.IsType<ViewResult>(result); Assert.True(controller.ModelState.ContainsKey("VideoUrl")); }
        mediator.Verify(m => m.Send(It.IsAny<EditVideoCommand>(), default), hasIntent ? Times.Once() : Times.Never());
    }
}
