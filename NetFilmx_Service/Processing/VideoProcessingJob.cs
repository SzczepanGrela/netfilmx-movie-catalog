using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NetFilmx_Service.Storage;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;

namespace NetFilmx_Service.Processing;

public sealed class VideoProcessingJob(
    ILogger<VideoProcessingJob> logger, ICloudStorageService storage,
    NetFilmxDbContext db, IFFmpegService ffmpeg, UploadStagingStore staging)
{
    public async Task ProcessVideoAsync(int videoId, string uploadId, CancellationToken token)
    {
        // One conversion at a time across instances sharing the same VPS staging mount.
        using var workerLock = await staging.AcquireWorkerLockAsync(token);
        var video = await db.Videos.Include(v => v.Subtitles).SingleOrDefaultAsync(v => v.Id == videoId, token);
        if (video is null || video.SourceUploadId != uploadId) return;
        if (video.VideoUrl is not ("PROCESSING" or "FAILED"))
        {
            // Duplicate delivery after a committed result must not transcode/upload again.
            if (video.ProcessedUploadId == uploadId) TryRemoveSource(uploadId);
            return;
        }
        string input = staging.InputPath(uploadId);
        string output = Path.Combine(Path.GetDirectoryName(input)!, "work-" + Guid.NewGuid().ToString("N"));
        try
        {
            if (!storage.IsConfigured) throw new InvalidOperationException("R2 uploads are not configured.");
            if (!File.Exists(input)) throw new IOException("The staged source is missing; restore it before retrying.");
            Directory.CreateDirectory(output);
            var subtitles = await ffmpeg.RunFFmpegHlsAsync(input, output, token);
            if (subtitles.Count > 32 || subtitles.Select(s => s.TrackKey).Distinct().Count() != subtitles.Count ||
                subtitles.Select(s => s.FileName).Distinct().Count() != subtitles.Count ||
                subtitles.Select(s => s.Position).Distinct().Count() != subtitles.Count)
                throw new SubtitleProcessingException("Duplicate or excessive subtitle output. Original source retained for review.");
            foreach (var subtitle in subtitles)
            {
                if (!VideoSubtitle.ValidMetadata(subtitle.TrackKey, subtitle.Language, subtitle.Label, subtitle.Position) ||
                    !System.Text.RegularExpressions.Regex.IsMatch(subtitle.FileName, @"\Asubtitle-[0-9]+\.vtt\z"))
                    throw new SubtitleProcessingException("Invalid subtitle output. Original source retained for review.");
                await WebVttFile.ReadAsync(Path.Combine(output, subtitle.FileName), token);
            }
            string url = await storage.UploadHlsAsync(output, token);
            if (!Uri.TryCreate(url, UriKind.Absolute, out var master) || master.Scheme != "https" ||
                master.UserInfo.Length != 0 || master.Query.Length != 0 || master.Fragment.Length != 0 ||
                !master.AbsolutePath.EndsWith("/master.m3u8", StringComparison.Ordinal))
                throw new IOException("Upload returned an invalid HLS location.");
            token.ThrowIfCancellationRequested();
            // Respect an admin edit/deletion that happened while this job was running.
            await db.Entry(video).ReloadAsync(token);
            if (db.Entry(video).State == EntityState.Detached || video.SourceUploadId != uploadId
                || video.VideoUrl is not ("PROCESSING" or "FAILED")) return;
            video.Subtitles.Clear();
            foreach (var subtitle in subtitles)
                video.Subtitles.Add(new VideoSubtitle(subtitle.TrackKey, subtitle.Language, subtitle.Label,
                    new Uri(master, subtitle.FileName).AbsoluteUri, subtitle.Position));
            video.VideoUrl = url;
            video.ProcessingError = null;
            video.ProcessedUploadId = uploadId;
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
        catch (Exception error)
        {
            // Discard any uncommitted subtitle inserts before recording a failure.
            db.ChangeTracker.Clear();
            video = await db.Videos.SingleOrDefaultAsync(v => v.Id == videoId, CancellationToken.None);
            if (video is not null && video.SourceUploadId == uploadId
                && video.VideoUrl is "PROCESSING" or "FAILED")
            {
                video.VideoUrl = "FAILED";
                video.ProcessingError = error is SubtitleProcessingException ? error.Message :
                    "Media processing failed. Original staged source retained; retry or ask the administrator to review it.";
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
