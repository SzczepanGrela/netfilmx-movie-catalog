namespace NetFilmx_Service.Processing;

// All production instances must mount the same private local filesystem here.
public sealed class UploadStagingStore
{
    private readonly string? _root;
    private const long MaxBytes = 1_000_000_000;
    public bool Enabled { get; }

    public UploadStagingStore(bool enabled, string? root)
    {
        Enabled = enabled;
        if (!enabled) return;
        if (string.IsNullOrWhiteSpace(root) || !Path.IsPathFullyQualified(root))
            throw new InvalidOperationException("Uploads require an absolute private staging directory.");
        _root = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar);
        if (string.IsNullOrEmpty(_root) || !Directory.Exists(_root))
            throw new InvalidOperationException("The upload staging directory must already exist on persistent storage.");
        RejectLinks(_root);
        if (!OperatingSystem.IsWindows() && (File.GetUnixFileMode(_root) &
            (UnixFileMode.GroupRead | UnixFileMode.GroupWrite | UnixFileMode.GroupExecute |
             UnixFileMode.OtherRead | UnixFileMode.OtherWrite | UnixFileMode.OtherExecute)) != 0)
            throw new InvalidOperationException("Upload staging permissions must exclude group and other users (0700).");
        using var probe = new FileStream(Path.Combine(_root, ".write-probe-" + Guid.NewGuid().ToString("N")),
            FileMode.CreateNew, FileAccess.Write, FileShare.None, 1, FileOptions.DeleteOnClose);
    }

    public async Task<string> StageAsync(Stream input, CancellationToken token)
    {
        EnsureEnabled();
        string id = Guid.NewGuid().ToString("N");
        string directory = Path.Combine(_root!, id);
        if (OperatingSystem.IsWindows()) Directory.CreateDirectory(directory);
        else Directory.CreateDirectory(directory, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        string partial = Path.Combine(directory, "source.partial");
        try
        {
            var options = new FileStreamOptions { Mode = FileMode.CreateNew, Access = FileAccess.Write,
                Share = FileShare.None, Options = FileOptions.Asynchronous };
            if (!OperatingSystem.IsWindows()) options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
            await using (var output = new FileStream(partial, options))
            {
                var buffer = new byte[81920];
                long length = 0;
                int read;
                while ((read = await input.ReadAsync(buffer, token)) != 0)
                {
                    length += read;
                    if (length > MaxBytes) throw new IOException("Upload exceeds the 1 GB limit.");
                    await output.WriteAsync(buffer.AsMemory(0, read), token);
                }
                if (length == 0) throw new IOException("The uploaded video is empty.");
                await output.FlushAsync(token);
                output.Flush(flushToDisk: true);
            }
            token.ThrowIfCancellationRequested();
            File.Move(partial, Path.Combine(directory, "source.upload"));
            return id;
        }
        catch
        {
            // Only this newly allocated, unpublished staging directory belongs to this request.
            Directory.Delete(directory, recursive: true);
            throw;
        }
    }

    public string InputPath(string id)
    {
        EnsureEnabled();
        if (!Guid.TryParseExact(id, "N", out var parsed) || parsed.ToString("N") != id)
            throw new ArgumentException("Invalid upload identifier.", nameof(id));
        var directory = Path.Combine(_root!, id);
        RejectLinks(directory);
        var path = Path.Combine(directory, "source.upload");
        RejectLinks(path);
        return path;
    }

    public Task<FileStream> AcquireWorkerLockAsync(CancellationToken token) => AcquireLockAsync(".worker.lock", token);

    public Task<FileStream> AcquireServerLeaseAsync(CancellationToken token) => AcquireLockAsync(".server.lock", token);

    private async Task<FileStream> AcquireLockAsync(string name, CancellationToken token)
    {
        EnsureEnabled();
        var path = Path.Combine(_root!, name);
        while (true)
        {
            token.ThrowIfCancellationRequested();
            RejectLinks(path);
            try
            {
                // Never unlink the lock file: concurrent workers must lock the same inode.
                var options = new FileStreamOptions { Mode = FileMode.OpenOrCreate, Access = FileAccess.ReadWrite, Share = FileShare.None };
                if (!OperatingSystem.IsWindows()) options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
                return new FileStream(path, options);
            }
            catch (IOException) { await Task.Delay(250, token); }
        }
    }

    public void RemoveInput(string id)
    {
        File.Delete(InputPath(id));
    }

    private void EnsureEnabled()
    {
        if (!Enabled) throw new InvalidOperationException("File uploads are disabled.");
    }

    private static void RejectLinks(string path)
    {
        for (string? current = path; current != null; current = Path.GetDirectoryName(current))
        {
            if ((File.Exists(current) || Directory.Exists(current)) &&
                (File.GetAttributes(current) & FileAttributes.ReparsePoint) != 0)
                throw new IOException("Staging paths must not contain symbolic links.");
        }
    }
}
