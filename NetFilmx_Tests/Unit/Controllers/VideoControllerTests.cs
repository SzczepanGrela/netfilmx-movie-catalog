using FluentAssertions;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Moq;
using NetFilmx_Service.Storage;
using NetFilmx_Web.Areas.Admin.Controllers;
using System.Threading.Tasks;
using Xunit;
using static NetFilmx_Web.Areas.Admin.Controllers.VideoController;

namespace NetFilmx_Tests.Unit.Controllers
{
    public class VideoControllerTests
    {
        [Fact]
        public async Task Add_ShouldReturnViewWithModelError_WhenBothVideoFileAndUrlAreEmpty()
        {
            // Arrange
            var mediatorMock = new Mock<IMediator>();
            var storageMock = new Mock<ICloudStorageService>();
            var searchEngineMock = new Mock<NetFilmx_Service.Search.ISearchEngine>();
            var dbContext = NetFilmx_Tests.Helpers.TestDbContextFactory.Create();
            var controller = new VideoController(mediatorMock.Object, storageMock.Object, dbContext, searchEngineMock.Object);

            var model = new UploadVideoViewModel
            {
                Title = "Test Title",
                Description = "Test Desc",
                Price = 10m,
                VideoFile = null,
                VideoUrl = ""
            };

            // Act
            var result = await controller.Add(model);

            // Assert
            var viewResult = result as ViewResult;
            viewResult.Should().NotBeNull();
            controller.ModelState.ErrorCount.Should().BeGreaterThan(0);
            controller.ModelState.ContainsKey("VideoFile").Should().BeTrue();
            controller.ModelState["VideoFile"]!.Errors[0].ErrorMessage.Should().Be("Musisz podać plik wideo lub link z YouTube.");
        }
    }
}
