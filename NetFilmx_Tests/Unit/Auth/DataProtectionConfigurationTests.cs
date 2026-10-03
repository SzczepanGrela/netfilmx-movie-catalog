using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using NetFilmx_Web.Security;

namespace NetFilmx_Tests.Unit.Auth;

public sealed class DataProtectionConfigurationTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "netfilmx-key-config-" + Guid.NewGuid().ToString("N"));
    private string Keys => Path.Combine(_root, "keys");

    public DataProtectionConfigurationTests()
    {
        if (OperatingSystem.IsWindows()) Directory.CreateDirectory(Keys);
        else Directory.CreateDirectory(Keys, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
    }

    private ServiceProvider Provider(string? path, string? contentRoot = null, string? webRoot = null, bool generateKeys = true)
    {
        var environment = new Mock<IWebHostEnvironment>();
        environment.SetupGet(e => e.ContentRootPath).Returns(contentRoot ?? Path.Combine(_root, "app"));
        environment.SetupGet(e => e.WebRootPath).Returns(webRoot ?? Path.Combine(_root, "app", "wwwroot"));
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton(environment.Object);
        services.AddSingleton<IConfiguration>(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["DataProtection:KeyRingPath"] = path
        }).Build());
        services.AddDurableDataProtection();
        if (!generateKeys) services.Configure<KeyManagementOptions>(options => options.AutoGenerateKeys = false);
        return services.BuildServiceProvider();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("relative/keys")]
    public void MissingOrRelativePath_RejectsStartup(string? path)
    {
        using var provider = Provider(path);
        Assert.Throws<InvalidOperationException>(() => provider.VerifyKeyRing());
    }

    [Fact]
    public void MissingDirectory_IsRejectedAndNeverCreated()
    {
        var path = Path.Combine(_root, "missing");
        using var provider = Provider(path);
        Assert.Throws<InvalidOperationException>(() => provider.VerifyKeyRing());
        Assert.False(Directory.Exists(path));
    }

    [Fact]
    public void ApplicationAndPublicPaths_RejectStartup()
    {
        using var inApplication = Provider(Keys, contentRoot: _root);
        Assert.Throws<InvalidOperationException>(() => inApplication.VerifyKeyRing());
        using var inWebRoot = Provider(Keys, webRoot: _root);
        Assert.Throws<InvalidOperationException>(() => inWebRoot.VerifyKeyRing());
    }

    [Fact]
    public void GroupOrWorldAccessibleDirectory_RejectsStartup()
    {
        if (OperatingSystem.IsWindows()) return;
        File.SetUnixFileMode(Keys, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute | UnixFileMode.GroupRead);
        using var provider = Provider(Keys);
        Assert.Throws<InvalidOperationException>(() => provider.VerifyKeyRing());
    }

    [Fact]
    public void SymlinkDirectoryOrKey_RejectsStartup()
    {
        if (OperatingSystem.IsWindows()) return;
        var link = Path.Combine(_root, "alias");
        Directory.CreateSymbolicLink(link, Keys);
        using var linkedDirectory = Provider(link);
        Assert.Throws<InvalidOperationException>(() => linkedDirectory.VerifyKeyRing());
        File.WriteAllText(Path.Combine(_root, "external.xml"), "<test />");
        File.CreateSymbolicLink(Path.Combine(Keys, "key.xml"), Path.Combine(_root, "external.xml"));
        using var linkedFile = Provider(Keys);
        Assert.Throws<InvalidOperationException>(() => linkedFile.VerifyKeyRing());
    }

    [Fact]
    public void CorruptRepository_RejectsStartup()
    {
        File.WriteAllText(Path.Combine(Keys, "key-invalid.xml"), "not XML");
        using var provider = Provider(Keys);
        Assert.ThrowsAny<Exception>(() => provider.VerifyKeyRing());
    }

    [Fact]
    public void DifferentApplicationName_CannotUnprotectSharedPayload()
    {
        using var provider = Provider(Keys);
        provider.VerifyKeyRing();
        var protectedValue = provider.GetRequiredService<IDataProtectionProvider>().CreateProtector("isolation-test").Protect("test");
        var other = DataProtectionProvider.Create(new DirectoryInfo(Keys), options => options.SetApplicationName("Another.App"));
        Assert.Throws<System.Security.Cryptography.CryptographicException>(() => other.CreateProtector("isolation-test").Unprotect(protectedValue));
    }

    [Fact]
    public void RetainedExpiredKey_StillUnprotectsAfterRestartAndAutomaticRotation()
    {
        string protectedValue;
        using (var previous = Provider(Keys, generateKeys: false))
        {
            previous.GetRequiredService<IKeyManager>().CreateNewKey(DateTimeOffset.UtcNow.AddDays(-120), DateTimeOffset.UtcNow.AddDays(-30));
            protectedValue = previous.GetRequiredService<IDataProtectionProvider>().CreateProtector("expired-key-test").Protect("old token");
        }
        using var restarted = Provider(Keys);
        restarted.VerifyKeyRing();
        Assert.Equal("old token", restarted.GetRequiredService<IDataProtectionProvider>().CreateProtector("expired-key-test").Unprotect(protectedValue));
        Assert.Contains(restarted.GetRequiredService<IKeyManager>().GetAllKeys(), key => key.ExpirationDate < DateTimeOffset.UtcNow);
        Assert.Contains(restarted.GetRequiredService<IKeyManager>().GetAllKeys(), key => key.ExpirationDate > DateTimeOffset.UtcNow);
    }

    public void Dispose() => Directory.Delete(_root, recursive: true);
}
