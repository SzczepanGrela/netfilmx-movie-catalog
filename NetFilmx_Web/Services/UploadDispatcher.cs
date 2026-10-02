using Hangfire;
using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;

namespace NetFilmx_Web.Services;

// Reconciles committed upload intents after a request/process interruption.
public sealed class UploadDispatcher(IServiceScopeFactory scopes, ILogger<UploadDispatcher> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                await DispatchAsync(scope.ServiceProvider.GetRequiredService<NetFilmxDbContext>(),
                    scope.ServiceProvider.GetRequiredService<IBackgroundJobClient>(), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch { logger.LogWarning("Upload dispatch failed; committed intents will be retried"); }
            try { await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
        }
    }

    public static async Task DispatchAsync(NetFilmxDbContext db, IBackgroundJobClient client, CancellationToken token)
    {
        var pending = await db.Videos.Where(v => v.SourceUploadId != null && v.UploadJobId == null
            && (v.VideoUrl == "PROCESSING" || v.VideoUrl == "FAILED"))
            .OrderBy(v => v.Id).Take(20).ToArrayAsync(token);
        foreach (var video in pending)
        {
            token.ThrowIfCancellationRequested();
            string jobId = client.Enqueue<VideoJobRunner>(runner => runner.RunAsync(video.Id, video.SourceUploadId!, CancellationToken.None));
            if (string.IsNullOrEmpty(jobId)) throw new InvalidOperationException("Queue did not accept the upload.");
            video.UploadJobId = jobId;
            await db.SaveChangesAsync(token);
            // Crash after enqueue/before save can deliver twice. The worker handles that safely.
        }
    }
}
