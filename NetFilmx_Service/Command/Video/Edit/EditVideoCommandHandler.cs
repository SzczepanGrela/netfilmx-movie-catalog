using MediatR;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;
using System.Text.RegularExpressions;

namespace NetFilmx_Service.Command.Video
{
    public sealed class EditVideoCommandHandler : IRequestHandler<EditVideoCommand, CResult>
    {
        private readonly IVideoRepository _repository;
        private readonly NetFilmx_Service.Search.ISearchEngine _searchEngine;

        public EditVideoCommandHandler(IVideoRepository repository, NetFilmx_Service.Search.ISearchEngine searchEngine)
        {
            _repository = repository;
            _searchEngine = searchEngine;
        }


        public async Task<CResult> Handle(EditVideoCommand command, CancellationToken cancellationToken)
        {
            if (command == null)
            {
                return CResult.Fail("Command is null");
            }

            var validation = new EditVideoCommandValidator().Validate(command);
            if (!validation.IsValid)
            {
                return CResult.Fail(validation);
            }


            var ytVideoId = ExtractYouTubeVideoId(command.Video_url);


            try
            {
                var video = await _repository.GetVideoByIdAsync(command.Id);

                //var video = task.Result;

                video.Price = command.Price;
                video.Title = command.Title;
                video.Description = command.Description;
                video.VideoUrl = ytVideoId;
                video.ThumbnailUrl = command.Thumbnail_url;
                video.UpdatedAt = DateTime.UtcNow;

                await _repository.UpdateVideoAsync(video);
                _searchEngine.IndexVideo(video);
                return CResult.Ok();
            }
            catch (Exception ex)
            {
                return CResult.Fail(ex.Message);
            }

        }

        public string ExtractYouTubeVideoId(string url)
        {
            if (string.IsNullOrEmpty(url))
                return string.Empty;

            var ytRegex = new Regex(@"(?:https?:\/\/)?(?:www\.)?(youtube\.com|youtu\.be)(\/watch\?v=|\/)([^&]+)?");
            var isYtLink = ytRegex.Match(url);

            if (isYtLink.Success)
            {
                return isYtLink.Groups[3].Value;
            }
            else
            {
                var linkRegex = new Regex(@"(www|http|https|\.com|\.net|\.org)");
                var isLink = linkRegex.IsMatch(url);

                return isLink ? string.Empty : url;
            }
        }



    }

}
