using System.Diagnostics;
using System.Text;

namespace NetFilmx_Service.Processing;

internal static class MediaProcess
{
    internal sealed record Result(int ExitCode, string Output, bool HasErrorOutput);

    internal static Task<Result> RunAsync(string executable, string arguments, TimeSpan timeout, CancellationToken token) =>
        RunAsync(new ProcessStartInfo(executable, arguments), timeout, token, 4096);

    internal static Task<Result> RunAsync(string executable, IReadOnlyList<string> arguments, TimeSpan timeout,
        CancellationToken token, int outputLimit = 65536)
    {
        var start = new ProcessStartInfo(executable);
        foreach (var argument in arguments) start.ArgumentList.Add(argument);
        return RunAsync(start, timeout, token, outputLimit);
    }

    private static async Task<Result> RunAsync(ProcessStartInfo start, TimeSpan timeout, CancellationToken token, int outputLimit)
    {
        token.ThrowIfCancellationRequested();
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(token);
        deadline.CancelAfter(timeout);
        start.UseShellExecute = false; start.RedirectStandardError = true;
        start.RedirectStandardOutput = true; start.CreateNoWindow = true;
        start.StandardOutputEncoding = Encoding.UTF8;
        using var process = new Process { StartInfo = start };
        process.Start();
        var stdout = DrainAsync(process.StandardOutput, outputLimit);
        var stderr = DrainAsync(process.StandardError, 0);
        try
        {
            await process.WaitForExitAsync(deadline.Token);
            var output = await stdout;
            var errors = await stderr;
            if (output.Overflow) throw new IOException("Media probe output exceeded its bounded limit.");
            return new Result(process.ExitCode, output.Text, errors.Any);
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

    private static async Task<(string Text, bool Any, bool Overflow)> DrainAsync(StreamReader reader, int limit)
    {
        var result = new StringBuilder();
        var buffer = new char[4096];
        int read;
        bool any = false, overflow = false;
        while ((read = await reader.ReadAsync(buffer)) != 0)
        {
            any = true;
            if (limit == 0) continue;
            int retain = Math.Min(read, limit - result.Length);
            if (retain < read) overflow = true;
            result.Append(buffer, 0, retain);
        }
        return (result.ToString(), any, overflow);
    }
}
