using Microsoft.Extensions.Logging;
using NetFilmx_Service.Storage;
using NetFilmx_Storage.Context;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;

namespace NetFilmx_Service.Processing
{
    public class VideoProcessingJob
    {
        private readonly ILogger<VideoProcessingJob> _logger;
        private readonly ICloudStorageService _cloudStorageService;
        private readonly NetFilmxDbContext _dbContext;
        private readonly IFFmpegService _ffmpegService;

        public VideoProcessingJob(ILogger<VideoProcessingJob> logger, ICloudStorageService cloudStorageService, NetFilmxDbContext dbContext, IFFmpegService ffmpegService)
        {
            _logger = logger;
            _cloudStorageService = cloudStorageService;
            _dbContext = dbContext;
            _ffmpegService = ffmpegService;
        }

        public async Task ProcessVideoAsync(int videoId, string inputFilePath)
        {
            _logger.LogInformation("Rozpoczynam przetwarzanie HLS dla wideo {VideoId}", videoId);

            var video = await _dbContext.Videos.FindAsync(videoId);
            if (video == null)
            {
                _logger.LogError("Nie znaleziono wideo o ID {VideoId}", videoId);
                return;
            }

            // Create temporary output directory for HLS files
            string outputDir = Path.Combine(Path.GetTempPath(), $"hls_video_{videoId}");
            if (!Directory.Exists(outputDir))
            {
                Directory.CreateDirectory(outputDir);
            }

            try
            {
                // Run FFmpeg to generate HLS (1080p, 720p, 480p)
                bool success = _ffmpegService.RunFFmpegHls(inputFilePath, outputDir);
                if (!success)
                {
                    _logger.LogError("Błąd podczas konwersji FFmpeg dla wideo {VideoId}", videoId);
                    video.VideoUrl = "FAILED";
                    await _dbContext.SaveChangesAsync();
                    return;
                }

                _logger.LogInformation("Konwersja HLS zakończona. Wysyłanie do Cloudflare R2...");

                // Upload to Cloudflare R2
                string r2Prefix = $"videos/{videoId}/hls";
                await _cloudStorageService.UploadDirectoryAsync(outputDir, r2Prefix);

                // Update database with the new HLS master playlist URL
                string masterPlaylistUrl = $"https://netfilmx-assets.grela.dev/{r2Prefix}/master.m3u8";
                video.VideoUrl = masterPlaylistUrl;
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("Zakończono przetwarzanie wideo {VideoId}. HLS URL: {Url}", videoId, masterPlaylistUrl);

                // Clean up original input file ONLY on success
                if (File.Exists(inputFilePath))
                {
                    File.Delete(inputFilePath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Błąd krytyczny podczas przetwarzania wideo {VideoId}. Zadanie zostanie ponowione.", videoId);
                throw; // Rethrow for Hangfire to catch and retry
            }
            finally
            {
                // Clean up local temp output directory
                if (Directory.Exists(outputDir))
                {
                    Directory.Delete(outputDir, true);
                }
            }
        }

    }
}
