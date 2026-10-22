using Hangfire;
using NetFilmx_Service.Processing;

namespace NetFilmx_Web.Services;

public sealed class VideoJobRunner(VideoProcessingJob job)
{
    [Queue("video")]
    [AutomaticRetry(Attempts = 3)]
    public Task RunAsync(int videoId, string uploadId, CancellationToken token) =>
        job.ProcessVideoAsync(videoId, uploadId, token);
}
