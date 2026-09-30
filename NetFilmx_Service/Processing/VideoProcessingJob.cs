using Microsoft.Extensions.Logging;
using NetFilmx_Service.Storage;
using NetFilmx_Storage.Context;
using System;
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
            _logger.LogInformation("Rozpoczynam przetwarzanie HLS dla wideo {VideoId} z pliku {InputPath}", videoId, inputFilePath);

            var video = await _dbContext.Videos.FindAsync(videoId);
            if (video == null)
            {
                _logger.LogError("Nie znaleziono wideo o ID {VideoId}", videoId);
                CleanupInputFile(inputFilePath);
                return;
            }

            // Create temporary output directory for HLS files
            string outputDir = Path.Combine(Path.GetTempPath(), $"hls_video_{videoId}_{Guid.NewGuid()}");
            if (!Directory.Exists(outputDir))
            {
                Directory.CreateDirectory(outputDir);
            }

            try
            {
                // Run FFmpeg to generate adaptive HLS
                bool success = _ffmpegService.RunFFmpegHls(inputFilePath, outputDir);
                if (!success)
                {
                    _logger.LogError("Błąd podczas konwersji FFmpeg dla wideo {VideoId}", videoId);
                    video.VideoUrl = "FAILED";
                    await _dbContext.SaveChangesAsync();
                    CleanupInputFile(inputFilePath);
                    return;
                }

                string masterPlaylistUrl;
                if (_cloudStorageService.IsConfigured)
                {
                    _logger.LogInformation("Wysyłanie pakietu HLS do Cloudflare R2 dla wideo {VideoId}...", videoId);
                    string r2Prefix = $"videos/{videoId}/hls";
                    await _cloudStorageService.UploadDirectoryAsync(outputDir, r2Prefix);
                    masterPlaylistUrl = $"https://netfilmx-assets.grela.dev/{r2Prefix}/master.m3u8";
                }
                else
                {
                    _logger.LogInformation("Cloudflare R2 nie jest skonfigurowane. Zapisywanie HLS lokalnie w wwwroot/hls/{VideoId}...", videoId);
                    string localHlsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "hls", videoId.ToString());
                    if (Directory.Exists(localHlsDir)) Directory.Delete(localHlsDir, true);
                    Directory.CreateDirectory(localHlsDir);

                    foreach (var file in Directory.GetFiles(outputDir))
                    {
                        File.Copy(file, Path.Combine(localHlsDir, Path.GetFileName(file)), true);
                    }
                    masterPlaylistUrl = $"/hls/{videoId}/master.m3u8";
                }

                // Update database with the new HLS master playlist URL
                video.VideoUrl = masterPlaylistUrl;
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("Zakończono pomyślnie przetwarzanie wideo {VideoId}. HLS URL: {Url}", videoId, masterPlaylistUrl);

                // Clean up original input file on success
                CleanupInputFile(inputFilePath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Błąd krytyczny podczas przetwarzania wideo {VideoId}.", videoId);
                video.VideoUrl = "FAILED";
                await _dbContext.SaveChangesAsync();
                CleanupInputFile(inputFilePath);
                throw;
            }
            finally
            {
                // Clean up local temp output directory
                if (Directory.Exists(outputDir))
                {
                    try
                    {
                        Directory.Delete(outputDir, true);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Nie udało się usunąć tymczasowego katalogu HLS {OutputDir}", outputDir);
                    }
                }
            }
        }

        private void CleanupInputFile(string path)
        {
            try
            {
                if (File.Exists(path))
                {
                    File.Delete(path);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Nie udało się usunąć pliku wejściowego {Path}", path);
            }
        }
    }
}
