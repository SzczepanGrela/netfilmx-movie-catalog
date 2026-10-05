using System.Diagnostics;
using System.Text;

namespace NetFilmx_Service.Processing;

internal static class MediaProcess
{
    internal sealed record Result(int ExitCode, string Output);

    internal static async Task<Result> RunAsync(string executable, string arguments, TimeSpan timeout, CancellationToken token)
    {
        token.ThrowIfCancellationRequested();
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(token);
        deadline.CancelAfter(timeout);
        using var process = new Process { StartInfo = new ProcessStartInfo(executable, arguments)
        {
            UseShellExecute = false, RedirectStandardError = true, RedirectStandardOutput = true, CreateNoWindow = true
        }};
        process.Start();
        var stdout = DrainAsync(process.StandardOutput, capture: true);
        var stderr = DrainAsync(process.StandardError, capture: false);
        try
        {
            await process.WaitForExitAsync(deadline.Token);
            return new Result(process.ExitCode, await stdout);
        }
        catch (OperationCanceledException)
        {
            if (!process.HasExited) process.Kill(entireProcessTree: true);
            await process.WaitForExitAsync(CancellationToken.None);
            if (token.IsCancellationRequested) throw;
            throw new TimeoutException("Media processing exceeded its time limit.");
        }
        finally { await Task.WhenAll(stdout, stderr); }
    }

    private static async Task<string> DrainAsync(StreamReader reader, bool capture)
    {
        var result = new StringBuilder();
        var buffer = new char[4096];
        int read;
        while ((read = await reader.ReadAsync(buffer)) != 0)
            if (capture && result.Length < 4096) result.Append(buffer, 0, Math.Min(read, 4096 - result.Length));
        return result.ToString();
    }
}
