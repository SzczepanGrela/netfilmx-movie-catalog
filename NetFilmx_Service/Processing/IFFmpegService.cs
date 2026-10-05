namespace NetFilmx_Service.Processing;

public interface IFFmpegService
{
    Task RunFFmpegHlsAsync(string inputPath, string outputDir, CancellationToken token);
}
