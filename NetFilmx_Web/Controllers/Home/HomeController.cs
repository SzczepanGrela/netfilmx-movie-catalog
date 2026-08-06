using MediatR;
using Microsoft.AspNetCore.Mvc;
using NetFilmx_Service.Dtos.Video;
using NetFilmx_Service.Dtos.Series;
using NetFilmx_Service.Query.Video;
using NetFilmx_Service.Query.Series;
using NetFilmx_Web.ViewModels;

namespace NetFilmx_Web.Controllers
{
    public class HomeController : Controller
    {
        private readonly IMediator _mediator;

        public HomeController(IMediator mediator)
        {
            _mediator = mediator;
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

        public async Task<IActionResult> Watch(int id)
        {
            var result = await _mediator.Send(new GetVideoByIdQuery<VideoCardDto>(id));
            if (result.IsFailure || result.Data == null)
            {
                TempData["ErrorMessage"] = "Film nie został znaleziony." ;
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }
    }
}
