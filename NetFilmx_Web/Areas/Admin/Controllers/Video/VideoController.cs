using Microsoft.AspNetCore.Authorization;
using NetFilmx_Service.Processing;
using Microsoft.AspNetCore.Http;
using System.IO;
using System.ComponentModel.DataAnnotations;
using NetFilmx_Service.Storage;
using MediatR;
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
        private readonly ICloudStorageService _storageService;
        private readonly UploadStagingStore _staging;
        private readonly NetFilmx_Storage.Context.NetFilmxDbContext _context;
        private readonly NetFilmx_Service.Search.ISearchEngine _searchEngine;

        public VideoController(IMediator mediator, ICloudStorageService storageService, UploadStagingStore staging, NetFilmx_Storage.Context.NetFilmxDbContext context, NetFilmx_Service.Search.ISearchEngine searchEngine)
        {
            _mediator = mediator;
            _storageService = storageService;
            _staging = staging;
            _context = context;
            _searchEngine = searchEngine;
        }

        public async Task<IActionResult> Index(int pageNumber = 1, string search = null)
        {
            ViewBag.SearchTerm = search;
            var query = new GetPagedVideosQuery<VideoListDto>(pageNumber, 10, search);
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
        [RequestSizeLimit(1073741824)] // 1 GB
        [RequestFormLimits(MultipartBodyLengthLimit = 1073741824)]
        public async Task<IActionResult> Add(UploadVideoViewModel model)
        {
            if (model.VideoFile == null && string.IsNullOrWhiteSpace(model.VideoUrl))
            {
                ModelState.AddModelError("VideoFile", "Musisz podać plik wideo lub link z YouTube.");
                ModelState.AddModelError("VideoUrl", "Musisz podać plik wideo lub link z YouTube.");
            }

            if (model.VideoFile is { Length: 0 } || model.VideoFile?.Length > 1_000_000_000)
                ModelState.AddModelError("VideoFile", "Plik wideo musi być niepusty i nie większy niż 1 GB.");

            if ((model.ThumbnailFile?.Length > 0 || model.VideoFile?.Length > 0) && (!_staging.Enabled || !_storageService.IsConfigured))
                ModelState.AddModelError("", "Wysyłanie plików wymaga skonfigurowanego magazynu mediów.");
            if (model.ThumbnailFile?.Length > 0 && model.ThumbnailFile.ContentType is not ("image/jpeg" or "image/png" or "image/webp"))
                ModelState.AddModelError("ThumbnailFile", "Plakat musi być obrazem JPEG, PNG lub WebP.");

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            // Upload plakatu (ThumbnailFile)
            string thumbnailUrl = model.ThumbnailUrl ?? "";
            if (model.ThumbnailFile != null && model.ThumbnailFile.Length > 0)
            {
                string tempThumbPath = Path.Combine(Path.GetTempPath(), $"netfilmx-poster-{Guid.NewGuid():N}");
                try
                {
                    await using (var stream = new FileStream(tempThumbPath, FileMode.CreateNew))
                        await model.ThumbnailFile.CopyToAsync(stream);
                    thumbnailUrl = await _storageService.UploadPosterAsync(tempThumbPath, model.ThumbnailFile.ContentType);
                }
                finally
                {
                    System.IO.File.Delete(tempThumbPath);
                }
            }

            // Set placeholder if file is provided
            string videoUrl = model.VideoFile != null ? "PROCESSING" : model.VideoUrl ?? "";

            string? uploadId = null;
            if (model.VideoFile is { Length: > 0 })
            {
                await using var input = model.VideoFile.OpenReadStream();
                uploadId = await _staging.StageAsync(input, HttpContext.RequestAborted);
            }
            var command = new AddVideoCommand(model.Title, model.Description, model.Price, videoUrl, thumbnailUrl, uploadId);
            var result = await _mediator.Send(command);
            if (result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Message;
                TempData["Errors"] = System.Text.Json.JsonSerializer.Serialize(result.Errors);
                return RedirectToAction("Error", "Home", new { area = "" });
            }

            int videoId = result.Data;

            // Save bilingual translations
            try
            {
                var video = await _context.Videos.FindAsync(videoId);
                if (video != null)
                {
                    video.Director = model.Director_En;
                    video.Cast = model.Cast_En;

                    var enTrans = new NetFilmx_Storage.Entities.VideoTranslation(videoId, "en", model.Title, model.Description, model.Director_En, model.Cast_En);
                    _context.VideoTranslations.Add(enTrans);

                    if (!string.IsNullOrWhiteSpace(model.Title_Pl) || !string.IsNullOrWhiteSpace(model.Description_Pl))
                    {
                        var plTrans = new NetFilmx_Storage.Entities.VideoTranslation(
                            videoId,
                            "pl",
                            !string.IsNullOrWhiteSpace(model.Title_Pl) ? model.Title_Pl : model.Title,
                            !string.IsNullOrWhiteSpace(model.Description_Pl) ? model.Description_Pl : model.Description,
                            model.Director_Pl ?? model.Director_En,
                            model.Cast_Pl ?? model.Cast_En
                        );
                        _context.VideoTranslations.Add(plTrans);
                    }

                    await _context.SaveChangesAsync();
                    _searchEngine.IndexVideo(video);
                }
            }
            catch
            {
                // Fallback gracefully
            }

            // The durable upload intent was saved with the video. The dispatcher enqueues it,
            // including after a crash between this save and the HTTP response.

            TempData["SuccessMessage"] = model.VideoFile != null 
                ? "Wideo zostało przesłane i zakolejkowane do przetwarzania HLS w tle. Status zmieni się po zakończeniu transkodowania." 
                : "Wideo zostało pomyślnie dodane.";
            return RedirectToAction("Index");
        }

        public class UploadVideoViewModel
        {
            [Required(ErrorMessage = "Tytuł jest wymagany")]
            [MaxLength(100, ErrorMessage = "Tytuł nie może przekraczać 100 znaków")]
            public string Title { get; set; }

            [Required(ErrorMessage = "Opis jest wymagany")]
            public string? Description { get; set; }

            public string? Title_Pl { get; set; }
            public string? Description_Pl { get; set; }
            public string? Director_En { get; set; }
            public string? Director_Pl { get; set; }
            public string? Cast_En { get; set; }
            public string? Cast_Pl { get; set; }

            [Required(ErrorMessage = "Cena jest wymagana")]
            [Range(0, 10000, ErrorMessage = "Cena musi być większa od 0")]
            public decimal Price { get; set; }

            public string? VideoUrl { get; set; }
            public string? ThumbnailUrl { get; set; }
            
            public IFormFile? VideoFile { get; set; }
            
            [Required(ErrorMessage = "Plakat jest wymagany")]
            public IFormFile? ThumbnailFile { get; set; }
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

            TempData["SuccessMessage"] = "Wideo zostało pomyślnie zaktualizowane.";
            return RedirectToAction("Index");
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

            TempData["SuccessMessage"] = "Wideo zostało pomyślnie usunięte z bazy danych i CDN.";
            return RedirectToAction("Index");
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
        public async Task<IActionResult> AddCategories(int videoId, List<int> categoryIds, string? videoName = null)
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

            TempData["SuccessMessage"] = "Kategorie zostały przypisane.";
            return RedirectToAction("Categories", new { videoId, videoName = videoName ?? "" });
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
        public async Task<IActionResult> RemoveCategories(int videoId, List<int> categoryIds, string? videoName = null)
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

            TempData["SuccessMessage"] = "Kategorie zostały usunięte z wideo.";
            return RedirectToAction("Categories", new { videoId, videoName = videoName ?? "" });
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
        public async Task<IActionResult> AddSeries(int videoId, List<int> seriesIds, string? videoName = null)
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

            TempData["SuccessMessage"] = "Serie zostały przypisane do wideo.";
            return RedirectToAction("Series", new { videoId, videoName = videoName ?? "" });
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
        public async Task<IActionResult> RemoveSeries(int videoId, List<int> seriesIds, string? videoName = null)
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

            TempData["SuccessMessage"] = "Serie zostały odłączone od wideo.";
            return RedirectToAction("Series", new { videoId, videoName = videoName ?? "" });
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
        public async Task<IActionResult> AddTags(int videoId, List<int> tagIds, string? videoName = null)
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

            TempData["SuccessMessage"] = "Tagi zostały przypisane.";
            return RedirectToAction("Tags", new { videoId, videoName = videoName ?? "" });
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
        public async Task<IActionResult> RemoveTags(int videoId, List<int> tagIds, string? videoName = null)
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

            TempData["SuccessMessage"] = "Tagi zostały odłączone.";
            return RedirectToAction("Tags", new { videoId, videoName = videoName ?? "" });
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

            TempData["SuccessMessage"] = "Komentarz został dodany.";
            return RedirectToAction("Comments", new { videoId = dto.VideoId });
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

            TempData["SuccessMessage"] = "Komentarz został usunięty.";
            return RedirectToAction("Comments", new { videoId });
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
        public async Task<IActionResult> AddUsers(int videoId, List<int> userIds, string? videoName = null)
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

            TempData["SuccessMessage"] = "Dostęp użytkowników został dodany.";
            return RedirectToAction("Users", new { videoId, videoName = videoName ?? "" });
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
        public async Task<IActionResult> RemoveUsers(int videoId, List<int> userIds, string? videoName = null)
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

            TempData["SuccessMessage"] = "Dostęp użytkowników został usunięty.";
            return RedirectToAction("Users", new { videoId, videoName = videoName ?? "" });
        }
    }
}
