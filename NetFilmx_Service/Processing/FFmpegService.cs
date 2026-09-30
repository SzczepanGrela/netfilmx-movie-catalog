using System.Diagnostics;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

namespace NetFilmx_Service.Processing
{
    public class FFmpegService : IFFmpegService
    {
        public bool RunFFmpegHls(string inputPath, string outputDir)
        {
            if (!File.Exists(inputPath))
            {
                return false;
            }

            // Probe input resolution and audio
            var (sourceWidth, sourceHeight) = ProbeResolution(inputPath);
            bool hasAudio = ProbeHasAudio(inputPath);

            // Determine active variants based on source height (Never upscale!)
            var variants = GetAdaptiveVariants(sourceWidth, sourceHeight);
            if (variants.Count == 0)
            {
                variants.Add(new VideoVariant("720p", 1280, 720, 1500, 1650, 2200, 128));
            }

            // Build filter_complex string
            var filterBuilder = new StringBuilder();
            filterBuilder.Append($"[0:v]split={variants.Count}");
            for (int i = 0; i < variants.Count; i++)
            {
                filterBuilder.Append($"[v{i}]");
            }
            filterBuilder.Append("; ");

            for (int i = 0; i < variants.Count; i++)
            {
                var v = variants[i];
                filterBuilder.Append($"[v{i}]scale=w={v.Width}:h={v.Height}:force_original_aspect_ratio=decrease,pad={v.Width}:{v.Height}:(ow-iw)/2:(oh-ih)/2[v{i}out]");
                if (i < variants.Count - 1)
                    filterBuilder.Append("; ");
            }

            // Build full ffmpeg arguments
            var args = new StringBuilder();
            args.Append($"-y -i \"{inputPath}\" ");
            
            // If no audio, generate silent audio so player doesn't fail
            if (!hasAudio)
            {
                args.Append("-f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 ");
            }

            args.Append($"-filter_complex \"{filterBuilder}\" ");

            // Maps and encoding settings per variant
            for (int i = 0; i < variants.Count; i++)
            {
                var v = variants[i];
                args.Append($"-map \"[v{i}out]\" -c:v:{i} libx264 -preset fast -crf 23 -b:v:{i} {v.BitrateK}k -maxrate:v:{i} {v.MaxRateK}k -bufsize:v:{i} {v.BufSizeK}k ");
            }

            // Audio mapping
            string audioSource = hasAudio ? "0:a:0" : "1:a:0";
            for (int i = 0; i < variants.Count; i++)
            {
                var v = variants[i];
                args.Append($"-map {audioSource} -c:a:{i} aac -b:a:{i} {v.AudioBitrateK}k -ac 2 ");
            }

            // HLS parameters (optimized 6s segments for responsive streaming and minimal R2 space overhead)
            args.Append("-f hls -hls_time 6 -hls_playlist_type vod -hls_flags independent_segments ");
            args.Append($"-hls_segment_type mpegts -hls_segment_filename \"{outputDir}/stream_%v_data%03d.ts\" ");
            args.Append("-master_pl_name master.m3u8 ");

            // var_stream_map
            var streamMap = new StringBuilder();
            for (int i = 0; i < variants.Count; i++)
            {
                if (i > 0) streamMap.Append(" ");
                streamMap.Append($"v:{i},a:{i}");
            }
            args.Append($"-var_stream_map \"{streamMap}\" ");
            args.Append($"\"{outputDir}/stream_%v.m3u8\"");

            var processStartInfo = new ProcessStartInfo
            {
                FileName = "ffmpeg",
                Arguments = args.ToString(),
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new Process { StartInfo = processStartInfo };
            
            var errorOutput = new StringBuilder();
            process.ErrorDataReceived += (sender, e) =>
            {
                if (!string.IsNullOrEmpty(e.Data))
                    errorOutput.AppendLine(e.Data);
            };

            process.Start();
            process.BeginErrorReadLine();
            process.WaitForExit();

            string masterPath = Path.Combine(outputDir, "master.m3u8");
            return process.ExitCode == 0 && File.Exists(masterPath);
        }

        private (int width, int height) ProbeResolution(string inputPath)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "ffprobe",
                    Arguments = $"-v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 \"{inputPath}\"",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = Process.Start(psi);
                if (process == null) return (1280, 720);
                
                string output = process.StandardOutput.ReadToEnd().Trim();
                process.WaitForExit();

                var match = Regex.Match(output, @"^(\d+)x(\d+)$");
                if (match.Success)
                {
                    int w = int.Parse(match.Groups[1].Value);
                    int h = int.Parse(match.Groups[2].Value);
                    return (w, h);
                }
            }
            catch
            {
                // Fallback default
            }

            return (1280, 720);
        }

        private bool ProbeHasAudio(string inputPath)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "ffprobe",
                    Arguments = $"-v error -select_streams a:0 -show_entries stream=channels -of csv=p=0 \"{inputPath}\"",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = Process.Start(psi);
                if (process == null) return true;

                string output = process.StandardOutput.ReadToEnd().Trim();
                process.WaitForExit();

                return !string.IsNullOrEmpty(output) && int.TryParse(output, out int channels) && channels > 0;
            }
            catch
            {
                return true;
            }
        }

        private List<VideoVariant> GetAdaptiveVariants(int sourceWidth, int sourceHeight)
        {
            var variants = new List<VideoVariant>();

            // Always ensure even dimensions for h264 scaling
            if (sourceHeight >= 1080)
            {
                variants.Add(new VideoVariant("1080p", 1920, 1080, 2400, 2600, 3500, 128));
                variants.Add(new VideoVariant("720p", 1280, 720, 1400, 1550, 2000, 128));
                variants.Add(new VideoVariant("480p", 854, 480, 750, 850, 1100, 96));
            }
            else if (sourceHeight >= 720)
            {
                variants.Add(new VideoVariant("720p", 1280, 720, 1400, 1550, 2000, 128));
                variants.Add(new VideoVariant("480p", 854, 480, 750, 850, 1100, 96));
                variants.Add(new VideoVariant("360p", 640, 360, 400, 450, 600, 64));
            }
            else if (sourceHeight >= 480)
            {
                variants.Add(new VideoVariant("480p", 854, 480, 750, 850, 1100, 96));
                variants.Add(new VideoVariant("360p", 640, 360, 400, 450, 600, 64));
            }
            else
            {
                int evenW = sourceWidth % 2 == 0 ? sourceWidth : sourceWidth - 1;
                int evenH = sourceHeight % 2 == 0 ? sourceHeight : sourceHeight - 1;
                variants.Add(new VideoVariant("orig", Math.Max(2, evenW), Math.Max(2, evenH), 350, 400, 500, 64));
            }

            return variants;
        }

        private class VideoVariant
        {
            public string Name { get; }
            public int Width { get; }
            public int Height { get; }
            public int BitrateK { get; }
            public int MaxRateK { get; }
            public int BufSizeK { get; }
            public int AudioBitrateK { get; }

            public VideoVariant(string name, int width, int height, int bitrateK, int maxRateK, int bufSizeK, int audioBitrateK)
            {
                Name = name;
                Width = width;
                Height = height;
                BitrateK = bitrateK;
                MaxRateK = maxRateK;
                BufSizeK = bufSizeK;
                AudioBitrateK = audioBitrateK;
            }
        }
    }
}
