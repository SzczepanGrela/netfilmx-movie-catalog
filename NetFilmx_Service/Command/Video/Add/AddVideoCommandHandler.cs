using MediatR;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Command.Video
{
    public sealed class AddVideoCommandHandler : IRequestHandler<AddVideoCommand, QResult<int>>
    {
        private readonly IVideoRepository _repository;
        private readonly NetFilmx_Service.Search.ISearchEngine _searchEngine;

        public AddVideoCommandHandler(IVideoRepository repository, NetFilmx_Service.Search.ISearchEngine searchEngine)
        {
            _repository = repository;
            _searchEngine = searchEngine;
        }

        public async Task<QResult<int>> Handle(AddVideoCommand command, CancellationToken cancellationToken)
        {
            if (command == null)
            {
                return QResult<int>.Fail("Command is null");
            }

            var validation = new AddVideoCommandValidator().Validate(command);
            if (!validation.IsValid)
            {
                return QResult<int>.Fail(validation);
            }

            if (command.SourceUploadId is not null &&
                (command.VideoUrl != "PROCESSING" || !Guid.TryParseExact(command.SourceUploadId, "N", out var uploadId)
                 || uploadId.ToString("N") != command.SourceUploadId))
                return QResult<int>.Fail("Invalid upload intent.");

            var video = new NetFilmx_Storage.Entities.Video(command.Title, command.Description, command.Price, command.VideoUrl, command.ThumbnailUrl)
            { SourceUploadId = command.SourceUploadId };

            try
            {
                await _repository.AddVideoAsync(video);
                _searchEngine.IndexVideo(video);
                return QResult<int>.Ok(video.Id);
            }
            catch (Exception ex)
            {
                return QResult<int>.Fail(ex.Message);
            }
        }

    }
}
