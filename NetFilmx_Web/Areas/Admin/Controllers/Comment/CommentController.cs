using Microsoft.AspNetCore.Authorization;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using NetFilmx_Service.Command.Comment;
using NetFilmx_Service.Dtos.Comment;
using NetFilmx_Service.Dtos.User;
using NetFilmx_Service.Dtos.Video;
using NetFilmx_Service.Query.Comment;
using NetFilmx_Service.Query.User;
using NetFilmx_Service.Query.Video;

namespace NetFilmx_Web.Areas.Admin.Controllers
{
    [Area("Admin")]
    [Authorize(Roles = "Admin")]
    public class CommentController : Controller
    {
        private readonly IMediator _mediator;

        public CommentController(IMediator mediator)
        {
            _mediator = mediator;
        }

        private async Task<List<UserListDto>> GetUsers()
        {
            var query = new GetAllUsersQuery<UserListDto>();
            var result = await _mediator.Send(query);
            return result.IsSuccess && result.Data != null ? result.Data : new List<UserListDto>();
        }

        private async Task<List<VideoListDto>> GetVideos()
        {
            var query = new GetAllVideosQuery<VideoListDto>();
            var result = await _mediator.Send(query);
            return result.IsSuccess && result.Data != null ? result.Data : new List<VideoListDto>();
        }

        public async Task<IActionResult> Index(int pageNumber = 1, string search = "")
        {
            var query = new GetPagedCommentsQuery<CommentListDto>(pageNumber, 10, search);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }

            ViewBag.SearchTerm = search;
            return View(result.Data);
        }

        public async Task<IActionResult> Details(int commentId)
        {
            var query = new GetCommentByIdQuery<CommentDetailsDto>(commentId);
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
        public async Task<IActionResult> Delete(int commentId)
        {
            var command = new DeleteCommentCommand(commentId);
            var result = await _mediator.Send(command);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }

            TempData["SuccessMessage"] = "Komentarz został usunięty.";
            return RedirectToAction("Index");
        }

        public async Task<IActionResult> Add()
        {
            var users = await GetUsers();
            var videos = await GetVideos();
            ViewBag.Users = new SelectList(users, "Id", "Username");
            ViewBag.Videos = new SelectList(videos, "Id", "Title");
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Add(CommentAddDto dto)
        {
            if (!ModelState.IsValid)
            {
                var users = await GetUsers();
                var videos = await GetVideos();
                ViewBag.Users = new SelectList(users, "Id", "Username");
                ViewBag.Videos = new SelectList(videos, "Id", "Title");
                return View(dto);
            }
            var command = new AddCommentCommand(dto.UserId, dto.VideoId, dto.Content);
            var result = await _mediator.Send(command);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }

            TempData["SuccessMessage"] = "Komentarz został pomyślnie dodany.";
            return RedirectToAction("Index");
        }
    }
}
