using Hangfire;
using Hangfire.AspNetCore;
using NetFilmx_Service.Processing;
using NetFilmx_Storage.Context;

namespace NetFilmx_Web.Services;

// One Hangfire server/dispatcher on the shared single-host staging filesystem.
// Rolling candidates wait while the old owner shuts its server down completely.
public sealed class SingletonUploadWorker(
    UploadStagingStore staging, JobStorage storage, IServiceScopeFactory scopes,
    ILogger<SingletonUploadWorker> logger) : BackgroundService
{
    private volatile bool _isOwner;
    public bool IsOwner => _isOwner;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await using var lease = await staging.AcquireServerLeaseAsync(stoppingToken);
            using var server = new BackgroundJobServer(new BackgroundJobServerOptions
            {
                Queues = new[] { "video" }, WorkerCount = 1,
                Activator = new AspNetCoreJobActivator(scopes),
                CancellationCheckInterval = TimeSpan.FromSeconds(1),
                ShutdownTimeout = TimeSpan.FromSeconds(20)
            }, storage);
            _isOwner = true;
            logger.LogInformation("Upload worker acquired shared server ownership.");
            try
            {
                while (!stoppingToken.IsCancellationRequested)
                {
                    try
                    {
                        using var scope = scopes.CreateScope();
                        await UploadDispatcher.DispatchAsync(scope.ServiceProvider.GetRequiredService<NetFilmxDbContext>(),
                            new BackgroundJobClient(storage), stoppingToken);
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
                    catch { logger.LogWarning("Upload dispatch failed; committed intents will be retried."); }
                    await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
                }
            }
            finally { _isOwner = false; }
            // Dispose server before releasing lease: a new owner must never start
            // processing while the previous server is still shutting down.
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }
}
