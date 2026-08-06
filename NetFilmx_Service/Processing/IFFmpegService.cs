namespace NetFilmx_Service.Processing
{
    public interface IFFmpegService
    {
        bool RunFFmpegHls(string inputPath, string outputDir);
    }
}
