using System.Diagnostics;
using System.IO;

namespace NetFilmx_Service.Processing
{
    public class FFmpegService : IFFmpegService
    {
        public bool RunFFmpegHls(string inputPath, string outputDir)
        {
            string masterPlaylistPath = Path.Combine(outputDir, "master.m3u8");

            string arguments = $"-i \"{inputPath}\" " +
                               "-filter_complex \"[0:v]split=4[v0][v1][v2][v3]; " +
                               "[v0]scale=w=1280:h=720[v0out]; " +
                               "[v1]scale=w=854:h=480[v1out]; " +
                               "[v2]scale=w=640:h=360[v2out]; " +
                               "[v3]scale=w=256:h=144[v3out]\" " +
                               "-map \"[v0out]\" -c:v:0 libx264 -b:v:0 2800k -maxrate:v:0 2996k -bufsize:v:0 4200k " +
                               "-map \"[v1out]\" -c:v:1 libx264 -b:v:1 1400k -maxrate:v:1 1498k -bufsize:v:1 2100k " +
                               "-map \"[v2out]\" -c:v:2 libx264 -b:v:2 800k -maxrate:v:2 856k -bufsize:v:2 1200k " +
                               "-map \"[v3out]\" -c:v:3 libx264 -b:v:3 250k -maxrate:v:3 267k -bufsize:v:3 400k " +
                               "-map a:0 -c:a:0 aac -b:a:0 128k -ac 2 " +
                               "-map a:0 -c:a:1 aac -b:a:1 128k -ac 2 " +
                               "-map a:0 -c:a:2 aac -b:a:2 128k -ac 2 " +
                               "-map a:0 -c:a:3 aac -b:a:3 64k -ac 2 " +
                               "-f hls -hls_time 10 -hls_playlist_type vod -hls_flags independent_segments " +
                               "-hls_segment_type mpegts -hls_segment_filename \"{outputDir}/stream_%v_data%03d.ts\" " +
                               "-master_pl_name master.m3u8 " +
                               "-var_stream_map \"v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3\" " +
                               $"\"{outputDir}/stream_%v.m3u8\"";

            var processStartInfo = new ProcessStartInfo
            {
                FileName = "ffmpeg",
                Arguments = arguments,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new Process { StartInfo = processStartInfo };
            
            process.OutputDataReceived += (sender, e) => { /* Ignore or log */ };
            process.ErrorDataReceived += (sender, e) => { /* Ignore or log */ };
            
            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            process.WaitForExit();

            return process.ExitCode == 0;
        }
    }
}
