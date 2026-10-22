using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.AspNetCore.DataProtection.Repositories;

namespace NetFilmx_Web.Security;

public static class DurableDataProtection
{
    // Keep this value across revisions and rolling instances. Other deployments
    // (including development) must use a separate directory, never production keys.
    public const string ApplicationName = "NetFilmx.Web";

    public static IServiceCollection AddDurableDataProtection(this IServiceCollection services)
    {
        services.AddDataProtection().SetApplicationName(ApplicationName);
        // Resolve configuration after the host is built, including test overrides.
        services.AddOptions<KeyManagementOptions>()
            .Configure<IConfiguration, IWebHostEnvironment, ILoggerFactory>((options, configuration, environment, logging) =>
            {
                var directory = ValidateDirectory(configuration["DataProtection:KeyRingPath"], environment);
                options.XmlRepository = new FileSystemXmlRepository(directory, logging);
            });
        return services;
    }

    public static void VerifyKeyRing(this IServiceProvider services)
    {
        // Force repository access and key creation before HTTP or workers start.
        // Never log the probe, protected payload or key material.
        var protector = services.GetRequiredService<IDataProtectionProvider>()
            .CreateProtector("NetFilmx.StartupProbe");
        var probe = Guid.NewGuid().ToString("N");
        if (protector.Unprotect(protector.Protect(probe)) != probe)
            throw new InvalidOperationException("Data Protection key ring verification failed.");
    }

    private static DirectoryInfo ValidateDirectory(string? configured, IWebHostEnvironment environment)
    {
        if (string.IsNullOrWhiteSpace(configured) || !Path.IsPathFullyQualified(configured))
            throw new InvalidOperationException("DataProtection:KeyRingPath must be an absolute private persistent directory.");
        var path = Path.TrimEndingDirectorySeparator(Path.GetFullPath(configured));
        var directory = new DirectoryInfo(path);
        if (!directory.Exists)
            throw new InvalidOperationException("The Data Protection directory must already exist on persistent storage.");
        foreach (var root in new[] { environment.ContentRootPath, environment.WebRootPath })
        {
            if (string.IsNullOrEmpty(root)) continue;
            var fullRoot = Path.TrimEndingDirectorySeparator(Path.GetFullPath(root));
            var comparison = OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
            if (path.Equals(fullRoot, comparison) || path.StartsWith(fullRoot + Path.DirectorySeparatorChar, comparison))
                throw new InvalidOperationException("Data Protection keys must be outside the application and public web directories.");
        }
        for (DirectoryInfo? current = directory; current != null; current = current.Parent)
            if ((current.Attributes & FileAttributes.ReparsePoint) != 0)
                throw new InvalidOperationException("Data Protection paths must not contain symbolic links.");
        if (!OperatingSystem.IsWindows() && File.GetUnixFileMode(path) !=
            (UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute))
            throw new InvalidOperationException("Data Protection directory permissions must be 0700.");
        foreach (var file in directory.EnumerateFiles("*.xml"))
            if ((file.Attributes & FileAttributes.ReparsePoint) != 0)
                throw new InvalidOperationException("Data Protection key files must not be symbolic links.");

        var probePath = Path.Combine(path, ".write-probe-" + Guid.NewGuid().ToString("N"));
        var probeOptions = new FileStreamOptions
        {
            Mode = FileMode.CreateNew, Access = FileAccess.ReadWrite, Share = FileShare.None,
            Options = FileOptions.DeleteOnClose
        };
        if (!OperatingSystem.IsWindows()) probeOptions.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
        using var probe = new FileStream(probePath, probeOptions);
        probe.WriteByte(1);
        probe.Flush(flushToDisk: true);
        return directory;
    }
}
