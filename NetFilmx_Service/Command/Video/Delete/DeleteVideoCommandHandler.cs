using MediatR;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Command.Video
{
    public sealed class DeleteVideoCommandHandler : IRequestHandler<DeleteVideoCommand, CResult>
    {

        private readonly IVideoRepository _repository;
        private readonly NetFilmx_Service.Storage.ICloudStorageService _cloudStorageService;

        public DeleteVideoCommandHandler(IVideoRepository repository, NetFilmx_Service.Storage.ICloudStorageService cloudStorageService)
        {
            _repository = repository;
            _cloudStorageService = cloudStorageService;
        }


        public async Task<CResult> Handle(DeleteVideoCommand command, CancellationToken cancellationToken)
        {
            if (command == null)
            {
                return CResult.Fail("Command is null");
            }
            try
            {
                var video = await _repository.GetVideoByIdAsync(command.Id);
                if (video != null)
                {
                    // Attempt to delete thumbnail if it's on R2
                    if (!string.IsNullOrEmpty(video.ThumbnailUrl) && video.ThumbnailUrl.Contains("thumbnails/"))
                    {
                        var key = video.ThumbnailUrl.Substring(video.ThumbnailUrl.IndexOf("thumbnails/"));
                        await _cloudStorageService.DeleteFileAsync(key);
                    }
                    
                    // Attempt to delete backdrop if it's on R2
                    if (!string.IsNullOrEmpty(video.BackdropUrl) && video.BackdropUrl.Contains("backdrops/"))
                    {
                        var key = video.BackdropUrl.Substring(video.BackdropUrl.IndexOf("backdrops/"));
                        await _cloudStorageService.DeleteFileAsync(key);
                    }

                    // Delete the HLS folder for this video ID
                    string r2Prefix = $"videos/{command.Id}/hls";
                    await _cloudStorageService.DeleteDirectoryAsync(r2Prefix);
                    
                    // Also delete any raw .mp4 or similar files in videos/{command.Id}/
                    await _cloudStorageService.DeleteDirectoryAsync($"videos/{command.Id}/");
                }

                await _repository.DeleteVideoAsync(command.Id);
                return CResult.Ok();
            }
            catch (Exception ex)
            {
                return CResult.Fail(ex.ToString());
            }


        }

    }
}
