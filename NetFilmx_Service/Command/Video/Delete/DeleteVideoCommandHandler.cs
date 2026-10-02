using MediatR;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Command.Video
{
    public sealed class DeleteVideoCommandHandler : IRequestHandler<DeleteVideoCommand, CResult>
    {

        private readonly IVideoRepository _repository;
        private readonly NetFilmx_Service.Search.ISearchEngine _searchEngine;

        public DeleteVideoCommandHandler(IVideoRepository repository, NetFilmx_Service.Search.ISearchEngine searchEngine)
        {
            _repository = repository;
            _searchEngine = searchEngine;
        }


        public async Task<CResult> Handle(DeleteVideoCommand command, CancellationToken cancellationToken)
        {
            if (command == null)
            {
                return CResult.Fail("Command is null");
            }
            try
            {
                // Media can be retained from another database or shared by multiple entries.
                // Removing catalogue metadata does not authorize deleting any storage objects.
                await _repository.DeleteVideoAsync(command.Id);
                _searchEngine.RemoveVideo(command.Id);
                return CResult.Ok();
            }
            catch (Exception ex)
            {
                return CResult.Fail(ex.ToString());
            }


        }

    }
}
