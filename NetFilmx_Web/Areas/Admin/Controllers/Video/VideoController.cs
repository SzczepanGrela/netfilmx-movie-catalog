using Microsoft.AspNetCore.Authorization;
﻿using MediatR;
using Microsoft.AspNetCore.Mvc;
using NetFilmx_Service.Command.Comment;
using NetFilmx_Service.Command.Video;
using NetFilmx_Service.Command.VideoPurchase;
using NetFilmx_Service.Dtos.Category;
using NetFilmx_Service.Dtos.Comment;
using NetFilmx_Service.Dtos.Series;
using NetFilmx_Service.Dtos.Tag;
using NetFilmx_Service.Dtos.User;
using NetFilmx_Service.Dtos.Video;
using NetFilmx_Service.Query.Category;
using NetFilmx_Service.Query.Comment;
using NetFilmx_Service.Query.Series;
using NetFilmx_Service.Query.Tag;
using NetFilmx_Service.Query.User;
using NetFilmx_Service.Query.Video;

namespace NetFilmx_Web.Areas.Admin.Controllers
{
    [Area("Admin")]
    [Authorize(Roles = "Admin")]
    public class VideoController : Controller
    {
        private readonly IMediator _mediator;

        public VideoController(IMediator mediator)
        {
            _mediator = mediator;
        }

        public async Task<IActionResult> Index()
        {
            var query = new GetAllVideosQuery<VideoListDto>();
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }


        public async Task<IActionResult> Details(int videoId)
        {
            var query = new GetVideoByIdQuery<VideoDetailsDto>(videoId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        public IActionResult Add()
        {
            return View();
        }


        [HttpPost]
        public async Task<IActionResult> Add(VideoAddDto dto)
        {
            var command = new AddVideoCommand(dto.Title, dto.Description, dto.Price, dto.VideoUrl, dto.ThumbnailUrl);
            var result = await _mediator.Send(command);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            ViewBag.Steps = 2;

            return View("~/Views/Shared/RedirectBack.cshtml");
        }

        public async Task<IActionResult> Edit(int videoId)
        {
            var query = new GetVideoByIdQuery<VideoEditDto>(videoId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }


        [HttpPost]
        public async Task<IActionResult> Edit(VideoEditDto dto)
        {
            var command = new EditVideoCommand(dto.Id, dto.Title, dto.Description, dto.Price, dto.VideoUrl, dto.ThumbnailUrl);
            var result = await _mediator.Send(command);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            ViewBag.Steps = 2;

            return View("~/Views/Shared/RedirectBack.cshtml");
        }

        [HttpPost]
        public async Task<IActionResult> Delete(int videoId)
        {
            var command = new DeleteVideoCommand(videoId);
            var result = await _mediator.Send(command);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            ViewBag.Steps = 2;

            return View("~/Views/Shared/RedirectBack.cshtml");
        }

        public async Task<IActionResult> Categories(int videoId, string videoName)
        {
            ViewBag.VideoName = videoName;
            ViewBag.VideoId = videoId;

            var query = new GetCategoriesByVideoIdQuery<CategoryListDto>(videoId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        public async Task<IActionResult> AddCategories(int videoId, string videoName)
        {
            ViewBag.VideoName = videoName;
            ViewBag.VideoId = videoId;
            var query = new GetCategoriesByExcludedVideoIdQuery<CategoryListDto>(videoId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        [HttpPost]
        public async Task<IActionResult> AddCategories(int videoId, List<int> categoryIds)
        {
            foreach (var categoryId in categoryIds)
            {
                var command = new AddVideoToCategoryCommand(categoryId, videoId);
                var result = await _mediator.Send(command);
                if (result.IsFailure)
                {
                    TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
                }
            }
            ViewBag.Steps = 2;

            return View("~/Views/Shared/RedirectBack.cshtml");
        }

        public async Task<IActionResult> RemoveCategories(int videoId, string videoName)
        {
            ViewBag.VideoName = videoName;
            ViewBag.VideoId = videoId;
            var query = new GetCategoriesByVideoIdQuery<CategoryListDto>(videoId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        [HttpPost]
        public async Task<IActionResult> RemoveCategories(int videoId, List<int> categoryIds)
        {
            foreach (var categoryId in categoryIds)
            {
                var command = new RemoveVideoFromCategoryCommand(categoryId, videoId);
                var result = await _mediator.Send(command);
                if (result.IsFailure)
                {
                    TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
                }
            }
            ViewBag.Steps = 2;

            return View("~/Views/Shared/RedirectBack.cshtml");
        }


        public async Task<IActionResult> Series(int videoId, string videoName)
        {
            ViewBag.VideoName = videoName;
            ViewBag.VideoId = videoId;
            var query = new GetSeriesByVideoIdQuery<SeriesListDto>(videoId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        public async Task<IActionResult> AddSeries(int videoId, string videoName)
        {
            ViewBag.VideoName = videoName;
            ViewBag.VideoId = videoId;
            var query = new GetSeriesByExcludedVideoIdQuery<SeriesListDto>(videoId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        [HttpPost]
        public async Task<IActionResult> AddSeries(int videoId, List<int> seriesIds)
        {
            foreach (var seriesId in seriesIds)
            {
                var command = new AddVideoToSeriesCommand(videoId, seriesId);
                var result = await _mediator.Send(command);
                if (result.IsFailure)
                {
                    TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
                }
            }
            ViewBag.Steps = 2;

            return View("~/Views/Shared/RedirectBack.cshtml");
        }

        public async Task<IActionResult> RemoveSeries(int videoId, string videoName)
        {
            ViewBag.VideoName = videoName;
            ViewBag.VideoId = videoId;
            var query = new GetSeriesByVideoIdQuery<SeriesListDto>(videoId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        [HttpPost]
        public async Task<IActionResult> RemoveSeries(int videoId, List<int> seriesIds)
        {
            foreach (var seriesId in seriesIds)
            {
                var command = new RemoveVideoFromSeriesCommand(seriesId, videoId);
                var result = await _mediator.Send(command);
                if (result.IsFailure)
                {
                    TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
                }
            }
            ViewBag.Steps = 2;

            return View("~/Views/Shared/RedirectBack.cshtml");
        }


        public async Task<IActionResult> Tags(int videoId, string videoName)
        {
            ViewBag.VideoName = videoName;
            ViewBag.VideoId = videoId;
            var query = new GetTagsByVideoIdQuery<TagListDto>(videoId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        public async Task<IActionResult> AddTags(int videoId, string videoName)
        {
            ViewBag.VideoName = videoName;
            ViewBag.VideoId = videoId;
            var query = new GetTagsByExcludedVideoIdQuery<TagListDto>(videoId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        [HttpPost]
        public async Task<IActionResult> AddTags(int videoId, List<int> tagIds)
        {
            foreach (var tagId in tagIds)
            {
                var command = new AddVideoToTagCommand(tagId, videoId);

                var result = await _mediator.Send(command);
                if (result.IsFailure)
                {
                    TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
                }
            }
            ViewBag.Steps = 2;

            return View("~/Views/Shared/RedirectBack.cshtml");
        }

        public async Task<IActionResult> RemoveTags(int videoId, string videoName)
        {
            ViewBag.VideoName = videoName;
            ViewBag.VideoId = videoId;
            var query = new GetTagsByVideoIdQuery<TagListDto>(videoId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        [HttpPost]
        public async Task<IActionResult> RemoveTags(int videoId, List<int> tagIds)
        {
            foreach (var tagId in tagIds)
            {
                var command = new RemoveVideoFromTagCommand(tagId, videoId);
                var result = await _mediator.Send(command);
                if (result.IsFailure)
                {
                    TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
                }
            }
            ViewBag.Steps = 2;

            return View("~/Views/Shared/RedirectBack.cshtml");
        }


        public async Task<IActionResult> Comments(int videoId, string videoName)
        {
            ViewBag.VideoName = videoName;
            ViewBag.VideoId = videoId;
            var query = new GetCommentsByVideoIdQuery<CommentListDto>(videoId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        public IActionResult AddComment(int videoId)
        {
            ViewBag.VideoId = videoId;
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> AddComment(CommentAddDto dto)
        {
            var command = new AddCommentCommand(dto.UserId, dto.VideoId, dto.Content);
            var result = await _mediator.Send(command);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            ViewBag.Steps = 2;

            return View("~/Views/Shared/RedirectBack.cshtml");
        }

        [HttpPost]
        public async Task<IActionResult> DeleteComment(int commentId, int videoId)
        {
            var command = new DeleteCommentCommand(commentId);
            var result = await _mediator.Send(command);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            ViewBag.Steps = 2;

            return View("~/Views/Shared/RedirectBack.cshtml");
        }


        public async Task<IActionResult> Users(int videoId, string videoName)
        {
            ViewBag.VideoName = videoName;
            ViewBag.VideoId = videoId;
            var query = new GetUsersByVideoIdQuery<UserListDto>(videoId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        public async Task<IActionResult> AddUsers(int videoId, string videoName)
        {
            ViewBag.VideoName = videoName;
            ViewBag.VideoId = videoId;
            var query = new GetUsersByExcludedVideoIdQuery<UserListDto>(videoId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        [HttpPost]
        public async Task<IActionResult> AddUsers(int videoId, List<int> userIds)
        {
            foreach (var userId in userIds)
            {
                var command = new AddVideoPurchaseCommand(userId, videoId);
                var result = await _mediator.Send(command);
                if (result.IsFailure)
                {
                    TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
                }
            }
            ViewBag.Steps = 2;

            return View("~/Views/Shared/RedirectBack.cshtml");
        }

        public async Task<IActionResult> RemoveUsers(int videoId, string videoName)
        {
            ViewBag.VideoName = videoName;
            ViewBag.VideoId = videoId;
            var query = new GetUsersByVideoIdQuery<UserListDto>(videoId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        [HttpPost]
        public async Task<IActionResult> RemoveUsers(int videoId, List<int> userIds)
        {
            foreach (var userId in userIds)
            {
                var command = new DeleteVideoPurchaseCommand(videoId, userId);
                var result = await _mediator.Send(command);
                if (result.IsFailure)
                {
                    TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
                }
            }
            ViewBag.Steps = 2;

            return View("~/Views/Shared/RedirectBack.cshtml");
        }
    }
}
