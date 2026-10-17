using Microsoft.AspNetCore.Authorization;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using NetFilmx_Service.Command.SeriesPurchase;
using NetFilmx_Service.Command.User;
using NetFilmx_Service.Command.VideoPurchase;
using NetFilmx_Service.Dtos.Comment;
using NetFilmx_Service.Dtos.Series;
using NetFilmx_Service.Dtos.User;
using NetFilmx_Service.Dtos.Video;
using NetFilmx_Service.Query.Comment;
using NetFilmx_Service.Query.Series;
using NetFilmx_Service.Query.User;
using NetFilmx_Service.Query.Video;

namespace NetFilmx_Web.Areas.Admin.Controllers
{
    [Area("Admin")]
    [Authorize(Roles = "Admin")]
    public class UserController : Controller
    {
        private readonly IMediator _mediator;

        public UserController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<IActionResult> IsUsernameAvailable(string username, int? userId)
        {
            var query = new IsUsernameAvailableQuery(username, userId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }

            return Json(result.Data);
        }

        public async Task<IActionResult> Index(int pageNumber = 1, string search = null)
        {
            ViewBag.SearchTerm = search;
            var query = new GetPagedUsersQuery<UserListDto>(pageNumber, 10, search);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        public async Task<IActionResult> Details(int userId)
        {
            var query = new GetUserByIdQuery<UserDetailsDto>(userId);
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
        public async Task<IActionResult> Add(UserAddDto dto)
        {
            if (!ModelState.IsValid)
            {
                return View(dto);
            }
            var command = new AddUserCommand(dto.Username, dto.Email, dto.Password);
            var result = await _mediator.Send(command);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }

            TempData["SuccessMessage"] = "Użytkownik został pomyślnie dodany.";
            return RedirectToAction("Index");
        }

        public async Task<IActionResult> Edit(int userId)
        {
            var query = new GetUserByIdQuery<UserEditDto>(userId);
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
        public async Task<IActionResult> Edit(UserEditDto dto)
        {
            if (!ModelState.IsValid)
            {
                return View(dto);
            }
            var command = new EditUserCommand(dto.Id, dto.Username, dto.Email);
            var result = await _mediator.Send(command);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }

            TempData["SuccessMessage"] = "Dane użytkownika zostały zaktualizowane.";
            return RedirectToAction("Index");
        }

        public IActionResult SetNewPassword(int userId, string userUsername)
        {
            ViewBag.UserUsername = userUsername;
            var dto = new UserPasswordDto { Id = userId };
            return View(dto);
        }

        [HttpPost]
        public async Task<IActionResult> SetNewPassword(UserPasswordDto dto)
        {
            if (!ModelState.IsValid)
            {
                return View(dto);
            }
            var command = new NewPasswordCommand(dto.Id, dto.Password);
            var result = await _mediator.Send(command);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }

            TempData["SuccessMessage"] = "Hasło użytkownika zostało pomyślnie zmienione.";
            return RedirectToAction("Index");
        }

        [HttpPost]
        public async Task<IActionResult> Delete(int userId)
        {
            var command = new DeleteUserCommand(userId);
            var result = await _mediator.Send(command);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }

            TempData["SuccessMessage"] = "Użytkownik został pomyślnie usunięty.";
            return RedirectToAction("Index");
        }

        public async Task<IActionResult> Comments(int userId, string userUsername)
        {
            ViewBag.UserUsername = userUsername;
            ViewBag.UserId = userId;
            var query = new GetCommentsByUserIdQuery<CommentListDto>(userId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        public async Task<IActionResult> Series(int userId, string userUsername)
        {
            ViewBag.UserUsername = userUsername;
            ViewBag.UserId = userId;
            var query = new GetSeriesByUserIdQuery<SeriesListDto>(userId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        public async Task<IActionResult> AddSeries(int userId, string userUsername)
        {
            ViewBag.UserUsername = userUsername;
            ViewBag.UserId = userId;
            var query = new GetSeriesByExcludedUserIdQuery<SeriesListDto>(userId);
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
        public async Task<IActionResult> AddSeries(int userId, List<int> seriesIds, string? userUsername = null)
        {
            foreach (var seriesId in seriesIds)
            {
                var command = new AddSeriesPurchaseCommand(seriesId, userId);
                var result = await _mediator.Send(command);
                if (result.IsFailure)
                {
                    TempData["ErrorMessage"] = result.Message;
                    TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                    return RedirectToAction("Error", "Home", new { area = "" });
                }
            }

            TempData["SuccessMessage"] = "Dostęp do serii został dodany.";
            return RedirectToAction("Series", new { userId, userUsername = userUsername ?? "" });
        }

        public async Task<IActionResult> RemoveSeries(int userId, string userUsername)
        {
            ViewBag.UserId = userId;
            ViewBag.UserUsername = userUsername;
            var query = new GetSeriesByUserIdQuery<SeriesListDto>(userId);
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
        public async Task<IActionResult> RemoveSeries(int userId, List<int> seriesIds, string? userUsername = null)
        {
            foreach (var seriesId in seriesIds)
            {
                var command = new DeleteSeriesPurchaseCommand(seriesId, userId);
                var result = await _mediator.Send(command);
                if (result.IsFailure)
                {
                    TempData["ErrorMessage"] = result.Message;
                    TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                    return RedirectToAction("Error", "Home", new { area = "" });
                }
            }

            TempData["SuccessMessage"] = "Dostęp do serii został odebrany.";
            return RedirectToAction("Series", new { userId, userUsername = userUsername ?? "" });
        }

        public async Task<IActionResult> Videos(int userId, string userUsername)
        {
            ViewBag.UserUsername = userUsername;
            ViewBag.UserId = userId;
            var query = new GetVideosByUserIdQuery<VideoListDto>(userId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        public async Task<IActionResult> AddVideos(int userId, string userUsername)
        {
            ViewBag.UserUsername = userUsername;
            ViewBag.UserId = userId;
            var query = new GetVideosByExcludedUserIdQuery<VideoListDto>(userId);
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
        public async Task<IActionResult> AddVideos(int userId, List<int> videoIds, string? userUsername = null)
        {
            foreach (var videoId in videoIds)
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

            TempData["SuccessMessage"] = "Dostęp do wideo został dodany.";
            return RedirectToAction("Videos", new { userId, userUsername = userUsername ?? "" });
        }

        public async Task<IActionResult> RemoveVideos(int userId, string userUsername)
        {
            ViewBag.UserUsername = userUsername;
            ViewBag.UserId = userId;
            var query = new GetVideosByUserIdQuery<VideoListDto>(userId);
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
        public async Task<IActionResult> RemoveVideos(int userId, List<int> videoIds, string? userUsername = null)
        {
            foreach (var videoId in videoIds)
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

            TempData["SuccessMessage"] = "Dostęp do wideo został odebrany.";
            return RedirectToAction("Videos", new { userId, userUsername = userUsername ?? "" });
        }
    }
}
