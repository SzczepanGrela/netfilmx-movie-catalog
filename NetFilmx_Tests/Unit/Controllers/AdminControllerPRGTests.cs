using FluentAssertions;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Moq;
using NetFilmx_Service.Command.Category;
using NetFilmx_Service.Command.Series;
using NetFilmx_Service.Command.Tag;
using NetFilmx_Service.Command.User;
using NetFilmx_Service.Command.Video;
using NetFilmx_Service.Dtos.Category;
using NetFilmx_Service.Dtos.Series;
using NetFilmx_Service.Dtos.Tag;
using NetFilmx_Service.Dtos.User;
using NetFilmx_Service.Dtos.Video;
using NetFilmx_Service.Result;
using NetFilmx_Service.Storage;
using NetFilmx_Web.Areas.Admin.Controllers;
using Xunit;

namespace NetFilmx_Tests.Unit.Controllers
{
    public class AdminControllerPRGTests
    {
        private readonly Mock<IMediator> _mediatorMock;
        private readonly Mock<ICloudStorageService> _storageMock;

        public AdminControllerPRGTests()
        {
            _mediatorMock = new Mock<IMediator>();
            _storageMock = new Mock<ICloudStorageService>();
        }

        private static void SetupTempData(Controller controller)
        {
            var httpContext = new DefaultHttpContext();
            var tempDataProvider = new Mock<ITempDataProvider>();
            controller.TempData = new TempDataDictionary(httpContext, tempDataProvider.Object);
            controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        }

        [Fact]
        public async Task VideoController_Delete_ShouldRedirectToIndex_WithSuccessMessage()
        {
            var dbContext = NetFilmx_Tests.Helpers.TestDbContextFactory.Create();
            var searchEngineMock = new Mock<NetFilmx_Service.Search.ISearchEngine>();
            var controller = new VideoController(_mediatorMock.Object, _storageMock.Object, dbContext, searchEngineMock.Object);
            SetupTempData(controller);

            _mediatorMock.Setup(m => m.Send(It.IsAny<DeleteVideoCommand>(), default))
                .ReturnsAsync(CResult.Ok());

            // Act
            var result = await controller.Delete(1);

            // Assert
            var redirect = result.Should().BeOfType<RedirectToActionResult>().Subject;
            redirect.ActionName.Should().Be("Index");
            controller.TempData["SuccessMessage"].Should().NotBeNull();
        }

        [Fact]
        public async Task CategoryController_Add_ShouldRedirectToIndex_WithSuccessMessage()
        {
            // Arrange
            var controller = new CategoryController(_mediatorMock.Object);
            SetupTempData(controller);

            _mediatorMock.Setup(m => m.Send(It.IsAny<AddCategoryCommand>(), default))
                .ReturnsAsync(CResult.Ok());

            var dto = new CategoryAddDto { Name = "Sci-Fi", Description = "Science Fiction" };

            // Act
            var result = await controller.Add(dto);

            // Assert
            var redirect = result.Should().BeOfType<RedirectToActionResult>().Subject;
            redirect.ActionName.Should().Be("Index");
            controller.TempData["SuccessMessage"].Should().NotBeNull();
        }

        [Fact]
        public async Task SeriesController_Edit_ShouldRedirectToIndex_WithSuccessMessage()
        {
            // Arrange
            var controller = new SeriesController(_mediatorMock.Object);
            SetupTempData(controller);

            _mediatorMock.Setup(m => m.Send(It.IsAny<EditSeriesCommand>(), default))
                .ReturnsAsync(CResult.Ok());

            var dto = new SeriesEditDto { Id = 1, Name = "Updated Series", Description = "Updated Desc", Price = 30m };

            // Act
            var result = await controller.Edit(dto);

            // Assert
            var redirect = result.Should().BeOfType<RedirectToActionResult>().Subject;
            redirect.ActionName.Should().Be("Index");
            controller.TempData["SuccessMessage"].Should().NotBeNull();
        }

        [Fact]
        public async Task TagController_Delete_ShouldRedirectToIndex_WithSuccessMessage()
        {
            // Arrange
            var controller = new TagController(_mediatorMock.Object);
            SetupTempData(controller);

            _mediatorMock.Setup(m => m.Send(It.IsAny<DeleteTagCommand>(), default))
                .ReturnsAsync(CResult.Ok());

            // Act
            var result = await controller.Delete(1);

            // Assert
            var redirect = result.Should().BeOfType<RedirectToActionResult>().Subject;
            redirect.ActionName.Should().Be("Index");
            controller.TempData["SuccessMessage"].Should().NotBeNull();
        }

        [Fact]
        public async Task UserController_Add_ShouldRedirectToIndex_WithSuccessMessage()
        {
            // Arrange
            var controller = new UserController(_mediatorMock.Object);
            SetupTempData(controller);

            _mediatorMock.Setup(m => m.Send(It.IsAny<AddUserCommand>(), default))
                .ReturnsAsync(CResult.Ok());

            var dto = new UserAddDto { Username = "newuser", Email = "new@netfilmx.dev", Password = "Password123!" };

            // Act
            var result = await controller.Add(dto);

            // Assert
            var redirect = result.Should().BeOfType<RedirectToActionResult>().Subject;
            redirect.ActionName.Should().Be("Index");
            controller.TempData["SuccessMessage"].Should().NotBeNull();
        }
    }
}
