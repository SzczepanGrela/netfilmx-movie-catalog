using MediatR;
using Microsoft.AspNetCore.Mvc;
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
using NetFilmx_Storage.Repositories;
using NetFilmx_Web.ViewModels;

namespace NetFilmx_Web.Controllers
{
    public class HomeController : Controller
    {
        private readonly IMediator _mediator;
        private readonly IUserRepository _userRepository;
        private readonly NetFilmx_Service.Search.ISearchEngine _searchEngine;

        public HomeController(IMediator mediator, IUserRepository userRepository, NetFilmx_Service.Search.ISearchEngine searchEngine)
        {
            _mediator = mediator;
            _userRepository = userRepository;
            _searchEngine = searchEngine;
        }

        [HttpGet]
        public IActionResult Error(string? errorMessage = null, List<string>? errors = null)
        {
            ViewBag.ErrorMessage = errorMessage ?? TempData["ErrorMessage"] as string;
            
            if (errors != null && errors.Any())
            {
                ViewBag.Errors = errors;
            }
            else if (TempData["Errors"] is string errorsJson)
            {
                try { ViewBag.Errors = System.Text.Json.JsonSerializer.Deserialize<List<string>>(errorsJson); } catch {}
            }
            
            return View();
        }

        [HttpGet]
        public IActionResult Privacy()
        {
            return View();
        }

        public async Task<IActionResult> Index()
        {
            var viewModel = new HomePageViewModel();

            // Get all videos with premium metadata
            var videosResult = await _mediator.Send(new GetAllVideosQuery<VideoCardDto>());
            if (videosResult.IsSuccess && videosResult.Data != null)
            {
                viewModel.AllVideos = videosResult.Data;
                // Pick first video with a backdrop as featured
                viewModel.FeaturedVideo = videosResult.Data
                    .FirstOrDefault(v => !string.IsNullOrEmpty(v.BackdropUrl))
                    ?? videosResult.Data.FirstOrDefault();
            }

            // Get all series with premium metadata
            var seriesResult = await _mediator.Send(new GetAllSeriesQuery<SeriesCardDto>());
            if (seriesResult.IsSuccess && seriesResult.Data != null)
            {
                viewModel.AllSeries = seriesResult.Data;
            }

            return View(viewModel);
        }

        public async Task<IActionResult> Movies(string? search = null, int? categoryId = null, int? tagId = null, int page = 1)
        {
            var lang = Request?.Cookies?["nfx_lang"] ?? "en";
            var viewModel = new MoviesPageViewModel
            {
                SearchTerm = search,
                SelectedCategoryId = categoryId,
                SelectedTagId = tagId,
                CurrentPage = Math.Max(1, page)
            };

            // Load filters
            var catResult = await _mediator.Send(new GetAllCategoriesQuery<CategoryListDto>());
            if (catResult.IsSuccess && catResult.Data != null)
                viewModel.Categories = catResult.Data;

            var tagResult = await _mediator.Send(new GetAllTagsQuery<TagListDto>());
            if (tagResult.IsSuccess && tagResult.Data != null)
                viewModel.Tags = tagResult.Data;

            List<VideoCardDto> allFilteredVideos;

            if (!string.IsNullOrWhiteSpace(search))
            {
                // Execute QWERTY Keyboard-Aware Fuzzy Search
                var searchResultSet = _searchEngine.Search(search, lang, documentType: "Movie", categoryId: categoryId, limit: 100);
                viewModel.DidYouMeanSuggestion = searchResultSet.DidYouMeanSuggestion;

                allFilteredVideos = searchResultSet.Items.Select(item => new VideoCardDto
                {
                    Id = item.Id,
                    Title = item.Title,
                    Description = item.Description,
                    Price = item.Price,
                    ThumbnailUrl = item.ThumbnailUrl ?? "",
                    BackdropUrl = item.BackdropUrl,
                    ReleaseYear = item.ReleaseYear,
                    DurationMinutes = item.DurationMinutes,
                    QualityBadge = item.QualityBadge,
                    AgeRating = item.AgeRating,
                    VideoUrl = ""
                }).ToList();
            }
            else if (categoryId.HasValue)
            {
                var byCat = await _mediator.Send(new GetVideosByCategoryIdQuery<VideoCardDto>(categoryId.Value));
                allFilteredVideos = byCat.IsSuccess && byCat.Data != null ? byCat.Data : new List<VideoCardDto>();
            }
            else if (tagId.HasValue)
            {
                var byTag = await _mediator.Send(new GetVideosByTagIdQuery<VideoCardDto>(tagId.Value));
                allFilteredVideos = byTag.IsSuccess && byTag.Data != null ? byTag.Data : new List<VideoCardDto>();
            }
            else
            {
                var allResult = await _mediator.Send(new GetAllVideosQuery<VideoCardDto>());
                allFilteredVideos = allResult.IsSuccess && allResult.Data != null ? allResult.Data : new List<VideoCardDto>();
            }

            const int pageSize = 12;
            viewModel.TotalCount = allFilteredVideos.Count;
            viewModel.TotalPages = Math.Max(1, (int)Math.Ceiling(viewModel.TotalCount / (double)pageSize));
            viewModel.Videos = allFilteredVideos
                .Skip((viewModel.CurrentPage - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return View(viewModel);
        }

        public async Task<IActionResult> Series(string? search = null, int page = 1)
        {
            var lang = Request?.Cookies?["nfx_lang"] ?? "en";
            var viewModel = new SeriesPageViewModel
            {
                SearchTerm = search,
                CurrentPage = Math.Max(1, page)
            };

            List<SeriesCardDto> allSeries;

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchResultSet = _searchEngine.Search(search, lang, documentType: "Series", limit: 100);
                viewModel.DidYouMeanSuggestion = searchResultSet.DidYouMeanSuggestion;

                allSeries = searchResultSet.Items.Select(item => new SeriesCardDto
                {
                    Id = item.Id,
                    Name = item.Title,
                    Description = item.Description,
                    Price = item.Price,
                    PosterUrl = item.ThumbnailUrl,
                    BackdropUrl = item.BackdropUrl,
                    ReleaseYear = item.ReleaseYear,
                    QualityBadge = item.QualityBadge,
                    AgeRating = item.AgeRating
                }).ToList();
            }
            else
            {
                var seriesResult = await _mediator.Send(new GetAllSeriesQuery<SeriesCardDto>());
                allSeries = seriesResult.IsSuccess && seriesResult.Data != null ? seriesResult.Data : new List<SeriesCardDto>();
            }

            const int pageSize = 12;
            viewModel.TotalCount = allSeries.Count;
            viewModel.TotalPages = Math.Max(1, (int)Math.Ceiling(viewModel.TotalCount / (double)pageSize));
            viewModel.Series = allSeries
                .Skip((viewModel.CurrentPage - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return View(viewModel);
        }

        public async Task<IActionResult> Details(int id)
        {
            var videoResult = await _mediator.Send(new GetVideoByIdQuery<VideoCardDto>(id));
            if (videoResult.IsFailure || videoResult.Data == null)
            {
                TempData["ErrorMessage"] = "Film nie został znaleziony.";
                return RedirectToAction("Error");
            }

            var viewModel = new MovieDetailsViewModel
            {
                Video = videoResult.Data
            };

            var catResult = await _mediator.Send(new GetCategoriesByVideoIdQuery<CategoryListDto>(id));
            if (catResult.IsSuccess && catResult.Data != null)
                viewModel.Categories = catResult.Data;

            var tagResult = await _mediator.Send(new GetTagsByVideoIdQuery<TagListDto>(id));
            if (tagResult.IsSuccess && tagResult.Data != null)
                viewModel.Tags = tagResult.Data;

            var commentsResult = await _mediator.Send(new GetCommentsByVideoIdQuery<CommentListDto>(id));
            if (commentsResult.IsSuccess && commentsResult.Data != null)
                viewModel.Comments = commentsResult.Data;

            if (User?.Identity?.IsAuthenticated == true && !string.IsNullOrEmpty(User.Identity.Name))
            {
                var user = await _userRepository.GetUserByUsernameAsync(User.Identity.Name);
                if (user != null)
                {
                    viewModel.UserBalance = user.Balance;
                }
            }

            return View(viewModel);
        }

        public async Task<IActionResult> SeriesDetails(int id)
        {
            var seriesResult = await _mediator.Send(new GetSeriesByIdQuery<SeriesCardDto>(id));
            if (seriesResult.IsFailure || seriesResult.Data == null)
            {
                TempData["ErrorMessage"] = "Seria nie została znaleziona.";
                return RedirectToAction("Error");
            }

            var episodesResult = await _mediator.Send(new GetVideosBySeriesIdQuery<VideoCardDto>(id));

            var viewModel = new SeriesDetailsViewModel
            {
                Series = seriesResult.Data,
                Episodes = episodesResult.IsSuccess && episodesResult.Data != null ? episodesResult.Data : new List<VideoCardDto>()
            };

            if (User?.Identity?.IsAuthenticated == true && !string.IsNullOrEmpty(User.Identity.Name))
            {
                var user = await _userRepository.GetUserByUsernameAsync(User.Identity.Name);
                if (user != null)
                {
                    viewModel.UserBalance = user.Balance;
                }
            }

            return View(viewModel);
        }

        public async Task<IActionResult> Watch(int id)
        {
            var result = await _mediator.Send(new GetVideoByIdQuery<VideoCardDto>(id));
            if (result.IsFailure || result.Data == null)
            {
                TempData["ErrorMessage"] = "Film nie został znaleziony.";
                return RedirectToAction("Error");
            }

            var viewModel = new WatchPageViewModel
            {
                Video = result.Data
            };

            if (User?.Identity?.IsAuthenticated == true && !string.IsNullOrEmpty(User.Identity.Name))
            {
                var user = await _userRepository.GetUserByUsernameAsync(User.Identity.Name);
                if (user != null)
                {
                    viewModel.UserBalance = user.Balance;
                }
            }

            return View(viewModel);
        }
    }
}
