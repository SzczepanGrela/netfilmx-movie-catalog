using Microsoft.AspNetCore.Authorization;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using NetFilmx_Service.Command.Category;
using NetFilmx_Service.Command.Video;
using NetFilmx_Service.Dtos.Category;
using NetFilmx_Service.Dtos.Video;
using NetFilmx_Service.Query.Category;
using NetFilmx_Service.Query.Video;

namespace NetFilmx_Web.Areas.Admin.Controllers
{
    [Area("Admin")]
    [Authorize(Roles = "Admin")]
    public class CategoryController : Controller
    {
        private readonly IMediator _mediator;

        public CategoryController(IMediator mediator)
        {
            _mediator = mediator;
        }

        public async Task<IActionResult> Index(int pageNumber = 1, string search = "")
        {
            var query = new GetPagedCategoriesQuery<CategoryListDto>(pageNumber, 10, search);
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

        public IActionResult Add()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Add(CategoryAddDto dto)
        {
            if (!ModelState.IsValid)
            {
                return View(dto);
            }
            var command = new AddCategoryCommand(dto.Name, dto.Description);
            var result = await _mediator.Send(command);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }

            TempData["SuccessMessage"] = "Kategoria została pomyślnie dodana.";
            return RedirectToAction("Index");
        }

        [HttpPost]
        public async Task<IActionResult> Delete(int categoryId)
        {
            var command = new DeleteCategoryCommand(categoryId);
            var result = await _mediator.Send(command);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }

            TempData["SuccessMessage"] = "Kategoria została pomyślnie usunięta.";
            return RedirectToAction("Index");
        }

        public async Task<IActionResult> Details(int categoryId)
        {
            var query = new GetCategoryByIdQuery<CategoryDetailsDto>(categoryId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }

            return View(result.Data);
        }

        public async Task<IActionResult> Edit(int categoryId)
        {
            var query = new GetCategoryByIdQuery<CategoryEditDto>(categoryId);
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
        public async Task<IActionResult> Edit(CategoryEditDto dto)
        {
            if (!ModelState.IsValid)
            {
                return View(dto);
            }
            var command = new EditCategoryCommand(dto.Id, dto.Name, dto.Description);
            var result = await _mediator.Send(command);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }

            TempData["SuccessMessage"] = "Kategoria została zaktualizowana.";
            return RedirectToAction("Index");
        }

        public async Task<IActionResult> Videos(int categoryId, string categoryName)
        {
            ViewBag.CategoryName = categoryName;
            ViewBag.CategoryId = categoryId;
            var query = new GetVideosByCategoryIdQuery<VideoListDto>(categoryId);
            var result = await _mediator.Send(query);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }
            return View(result.Data);
        }

        public async Task<IActionResult> AddVideos(int categoryId, string categoryName)
        {
            ViewBag.CategoryName = categoryName;
            ViewBag.CategoryId = categoryId;
            var query = new GetVideosByExcludedCategoryQuery<VideoListDto>(categoryId);
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
        public async Task<IActionResult> AddVideos(int categoryId, List<int> videoIds, string? categoryName = null)
        {
            foreach (var videoId in videoIds)
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

            TempData["SuccessMessage"] = "Filmy zostały przypisane do kategorii.";
            return RedirectToAction("Videos", new { categoryId, categoryName = categoryName ?? "" });
        }

        public async Task<IActionResult> RemoveVideos(int categoryId, string categoryName)
        {
            ViewBag.CategoryId = categoryId;
            ViewBag.CategoryName = categoryName;
            var query = new GetVideosByCategoryIdQuery<VideoListDto>(categoryId);
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
        public async Task<IActionResult> RemoveVideos(int categoryId, List<int> videoIds, string? categoryName = null)
        {
            foreach (var videoId in videoIds)
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

            TempData["SuccessMessage"] = "Filmy zostały usunięte z kategorii.";
            return RedirectToAction("Videos", new { categoryId, categoryName = categoryName ?? "" });
        }
    }
}
