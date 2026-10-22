namespace NetFilmx_Service.Processing;

public interface IFFmpegService
{
    Task<IReadOnlyList<SubtitleFile>> RunFFmpegHlsAsync(string inputPath, string outputDir, CancellationToken token);
}
