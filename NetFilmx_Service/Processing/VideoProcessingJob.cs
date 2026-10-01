using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NetFilmx_Service.Storage;
using NetFilmx_Storage.Context;

namespace NetFilmx_Service.Processing;

public sealed class VideoProcessingJob(
    ILogger<VideoProcessingJob> logger, ICloudStorageService storage,
    NetFilmxDbContext db, IFFmpegService ffmpeg, UploadStagingStore staging)
{
    public async Task ProcessVideoAsync(int videoId, string uploadId, CancellationToken token)
    {
        // One conversion at a time across instances sharing the same VPS staging mount.
        using var workerLock = await staging.AcquireWorkerLockAsync(token);
        var video = await db.Videos.SingleOrDefaultAsync(v => v.Id == videoId, token);
        if (video is null || video.SourceUploadId != uploadId) return;
        if (video.VideoUrl is not ("PROCESSING" or "FAILED"))
        {
            // Duplicate delivery after a committed result must not transcode/upload again.
            TryRemoveSource(uploadId);
            return;
        }
        string input = staging.InputPath(uploadId);
        string output = Path.Combine(Path.GetDirectoryName(input)!, "work-" + Guid.NewGuid().ToString("N"));
        try
        {
            if (!storage.IsConfigured) throw new InvalidOperationException("R2 uploads are not configured.");
            if (!File.Exists(input)) throw new IOException("The staged source is missing; restore it before retrying.");
            Directory.CreateDirectory(output);
            await ffmpeg.RunFFmpegHlsAsync(input, output, token);
            string url = await storage.UploadHlsAsync(output, token);
            token.ThrowIfCancellationRequested();
            // Respect an admin edit/deletion that happened while this job was running.
            await db.Entry(video).ReloadAsync(token);
            if (db.Entry(video).State == EntityState.Detached || video.SourceUploadId != uploadId
                || video.VideoUrl is not ("PROCESSING" or "FAILED")) return;
            video.VideoUrl = url;
            video.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(token);
            TryRemoveSource(uploadId);
            logger.LogInformation("Video processing completed for video {VideoId}", videoId);
        }
        catch (OperationCanceledException) when (token.IsCancellationRequested)
        {
            // Hangfire requeues interrupted work; retain both source and durable intent.
            throw;
        }
        catch
        {
            await db.Entry(video).ReloadAsync(CancellationToken.None);
            if (db.Entry(video).State != EntityState.Detached && video.SourceUploadId == uploadId
                && video.VideoUrl is "PROCESSING" or "FAILED")
            {
                video.VideoUrl = "FAILED";
                await db.SaveChangesAsync(CancellationToken.None);
            }
            throw;
        }
        finally
        {
            if (Directory.Exists(output)) Directory.Delete(output, recursive: true);
        }
    }

    private void TryRemoveSource(string uploadId)
    {
        try { staging.RemoveInput(uploadId); }
        catch (IOException) { logger.LogWarning("Completed upload {UploadId} retains its staged source for cleanup", uploadId); }
        catch (UnauthorizedAccessException) { logger.LogWarning("Cannot clean up completed upload {UploadId}", uploadId); }
    }
}
