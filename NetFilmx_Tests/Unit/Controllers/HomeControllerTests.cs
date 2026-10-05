using FluentAssertions;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Moq;
using NetFilmx_Service.Dtos.Category;
using NetFilmx_Service.Dtos.Comment;
using NetFilmx_Service.Dtos.Series;
using NetFilmx_Service.Dtos.Tag;
using NetFilmx_Service.Dtos.Video;
using NetFilmx_Service.Query.Category;
using NetFilmx_Service.Query.Comment;
using NetFilmx_Service.Query.Series;
using NetFilmx_Service.Query.Tag;
using NetFilmx_Service.Query.Video;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;
using NetFilmx_Web.Controllers;
using NetFilmx_Web.ViewModels;

namespace NetFilmx_Tests.Unit.Controllers
{
    public class HomeControllerTests
    {
        private readonly Mock<IMediator> _mediatorMock;
        private readonly Mock<IUserRepository> _userRepoMock;
        private readonly Mock<NetFilmx_Service.Search.ISearchEngine> _searchEngineMock;
        private readonly HomeController _controller;

        public HomeControllerTests()
        {
            _mediatorMock = new Mock<IMediator>();
            _userRepoMock = new Mock<IUserRepository>();
            _searchEngineMock = new Mock<NetFilmx_Service.Search.ISearchEngine>();
            _controller = new HomeController(_mediatorMock.Object, _userRepoMock.Object, _searchEngineMock.Object);
        }

        [Fact]
        public async Task Index_ShouldReturnViewWithPopulatedViewModel()
        {
            // Arrange
            var testVideos = new List<VideoCardDto>
            {
                new VideoCardDto(1, "Big Buck Bunny", "Description", "https://cdn/hls/master.m3u8", "https://cdn/thumb.jpg", 10, "https://cdn/backdrop.jpg", null, null, 2026, 10, "Blender", "Bunny", "ALL", "4K", null)
            };
            var testSeries = new List<SeriesCardDto>
            {
                new SeriesCardDto(1, "Open Movies", "Series Description", 50, "https://cdn/poster.jpg", null, null, null, 2026, "Blender", "Various", "ALL", "HD")
            };

            _mediatorMock.Setup(m => m.Send(It.IsAny<GetAllVideosQuery<VideoCardDto>>(), default))
                .ReturnsAsync(QResult<List<VideoCardDto>>.Ok(testVideos));

            _mediatorMock.Setup(m => m.Send(It.IsAny<GetAllSeriesQuery<SeriesCardDto>>(), default))
                .ReturnsAsync(QResult<List<SeriesCardDto>>.Ok(testSeries));

            // Act
            var result = await _controller.Index();

            // Assert
            var viewResult = result.Should().BeOfType<ViewResult>().Subject;
            var model = viewResult.Model.Should().BeOfType<HomePageViewModel>().Subject;
            model.AllVideos.Should().HaveCount(1);
            model.FeaturedVideo.Should().NotBeNull();
            model.FeaturedVideo!.Title.Should().Be("Big Buck Bunny");
            model.AllSeries.Should().HaveCount(1);
        }

        [Fact]
        public async Task Movies_ShouldReturnFilteredPagedVideos()
        {
            // Arrange
            var testVideos = new List<VideoCardDto>
            {
                new VideoCardDto(1, "Sintel", "Dragon fantasy", "url", "thumb", 15, "backdrop", null, null, 2026, 15, "Colin Levy", "Sintel", "12+", "4K", null),
                new VideoCardDto(2, "Tears of Steel", "Sci-Fi short", "url", "thumb", 20, "backdrop", null, null, 2026, 12, "Ian Hubert", "Cast", "16+", "HD", null)
            };

            _mediatorMock.Setup(m => m.Send(It.IsAny<GetAllVideosQuery<VideoCardDto>>(), default))
                .ReturnsAsync(QResult<List<VideoCardDto>>.Ok(testVideos));
            _mediatorMock.Setup(m => m.Send(It.IsAny<GetAllCategoriesQuery<CategoryListDto>>(), default))
                .ReturnsAsync(QResult<List<CategoryListDto>>.Ok(new List<CategoryListDto>()));
            _mediatorMock.Setup(m => m.Send(It.IsAny<GetAllTagsQuery<TagListDto>>(), default))
                .ReturnsAsync(QResult<List<TagListDto>>.Ok(new List<TagListDto>()));

            var searchResult = new NetFilmx_Service.Search.SearchResultSet
            {
                Items = new List<NetFilmx_Service.Search.SearchResultItem>
                {
                    new NetFilmx_Service.Search.SearchResultItem { Id = 1, Title = "Sintel", Description = "Dragon fantasy", Price = 15 }
                }
            };
            _searchEngineMock.Setup(s => s.Search("Sintel", It.IsAny<string>(), "Movie", null, 100))
                .Returns(searchResult);

            // Act
            var result = await _controller.Movies(search: "Sintel");

            // Assert
            var viewResult = result.Should().BeOfType<ViewResult>().Subject;
            var model = viewResult.Model.Should().BeOfType<MoviesPageViewModel>().Subject;
            model.Videos.Should().HaveCount(1);
            model.Videos[0].Title.Should().Be("Sintel");
        }

        [Fact]
        public async Task Movies_ShouldMatchMultiTokenSearchAcrossFields()
        {
            // Arrange
            var testVideos = new List<VideoCardDto>
            {
                new VideoCardDto(1, "Sintel", "Dragon warrior quest", "url", "thumb", 15, "backdrop", null, null, 2026, 15, "Colin Levy", "Sintel", "12+", "4K", null),
                new VideoCardDto(2, "Tears of Steel", "Sci-Fi robots apocalypse", "url", "thumb", 20, "backdrop", null, null, 2026, 12, "Ian Hubert", "Cast", "16+", "HD", null)
            };

            _mediatorMock.Setup(m => m.Send(It.IsAny<GetAllVideosQuery<VideoCardDto>>(), default))
                .ReturnsAsync(QResult<List<VideoCardDto>>.Ok(testVideos));
            _mediatorMock.Setup(m => m.Send(It.IsAny<GetAllCategoriesQuery<CategoryListDto>>(), default))
                .ReturnsAsync(QResult<List<CategoryListDto>>.Ok(new List<CategoryListDto>()));
            _mediatorMock.Setup(m => m.Send(It.IsAny<GetAllTagsQuery<TagListDto>>(), default))
                .ReturnsAsync(QResult<List<TagListDto>>.Ok(new List<TagListDto>()));

            var searchResult = new NetFilmx_Service.Search.SearchResultSet
            {
                Items = new List<NetFilmx_Service.Search.SearchResultItem>
                {
                    new NetFilmx_Service.Search.SearchResultItem { Id = 1, Title = "Sintel", Description = "Dragon warrior quest", Price = 15 }
                }
            };
            _searchEngineMock.Setup(s => s.Search("warrior Colin", It.IsAny<string>(), "Movie", null, 100))
                .Returns(searchResult);

            // Act: Search with two tokens matching description and director
            var result = await _controller.Movies(search: "warrior Colin");

            // Assert
            var viewResult = result.Should().BeOfType<ViewResult>().Subject;
            var model = viewResult.Model.Should().BeOfType<MoviesPageViewModel>().Subject;
            model.Videos.Should().HaveCount(1);
            model.Videos[0].Title.Should().Be("Sintel");
        }

        [Fact]
        public async Task Details_ShouldReturnMovieDetails_WhenVideoExists()
        {
            // Arrange
            var video = new VideoCardDto(1, "Cosmos Laundromat", "Sheep adventure", "url", "thumb", 10, "backdrop", null, null, 2026, 12, "Mathieu", "Franck", "16+", "4K", null);

            _mediatorMock.Setup(m => m.Send(It.IsAny<GetVideoByIdQuery<VideoCardDto>>(), default))
                .ReturnsAsync(QResult<VideoCardDto>.Ok(video));
            _mediatorMock.Setup(m => m.Send(It.IsAny<GetCategoriesByVideoIdQuery<CategoryListDto>>(), default))
                .ReturnsAsync(QResult<List<CategoryListDto>>.Ok(new List<CategoryListDto>()));
            _mediatorMock.Setup(m => m.Send(It.IsAny<GetTagsByVideoIdQuery<TagListDto>>(), default))
                .ReturnsAsync(QResult<List<TagListDto>>.Ok(new List<TagListDto>()));
            _mediatorMock.Setup(m => m.Send(It.IsAny<GetCommentsByVideoIdQuery<CommentListDto>>(), default))
                .ReturnsAsync(QResult<List<CommentListDto>>.Ok(new List<CommentListDto>()));

            // Act
            var result = await _controller.Details(1);

            // Assert
            var viewResult = result.Should().BeOfType<ViewResult>().Subject;
            var model = viewResult.Model.Should().BeOfType<MovieDetailsViewModel>().Subject;
            model.Video.Title.Should().Be("Cosmos Laundromat");
        }

        [Fact]
        public void Privacy_ShouldReturnView()
        {
            // Act
            var result = _controller.Privacy();

            // Assert
            result.Should().BeOfType<ViewResult>();
        }
    }
}
