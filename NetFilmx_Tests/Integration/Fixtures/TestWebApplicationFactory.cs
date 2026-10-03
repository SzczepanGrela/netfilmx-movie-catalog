using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NetFilmx_Storage.Context;
using System.Collections.Generic;
using System.Linq;

namespace NetFilmx_Tests.Integration.Fixtures
{
    public class TestWebApplicationFactory<TProgram>
        : WebApplicationFactory<TProgram> where TProgram : class
    {
        private readonly string _databasePath;
        private readonly string _keyRingPath;
        private readonly bool _ownsDatabase;
        private readonly bool _ownsKeyRing;
        private readonly bool _prepareDatabase;

        public TestWebApplicationFactory() : this(null, null) { }

        internal TestWebApplicationFactory(string? databasePath, string? keyRingPath, bool prepareDatabase = true)
        {
            _prepareDatabase = prepareDatabase;
            _ownsDatabase = databasePath == null;
            _ownsKeyRing = keyRingPath == null;
            _databasePath = databasePath ?? Path.Combine(Path.GetTempPath(), "netfilmx-auth-test-" + Guid.NewGuid().ToString("N") + ".db");
            _keyRingPath = keyRingPath ?? Path.Combine(Path.GetTempPath(), "netfilmx-test-keys-" + Guid.NewGuid().ToString("N"));
            if (_ownsKeyRing)
            {
                if (OperatingSystem.IsWindows()) Directory.CreateDirectory(_keyRingPath);
                else Directory.CreateDirectory(_keyRingPath, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
            }
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            if (disposing && _ownsDatabase)
                foreach (var suffix in new[] { "", "-wal", "-shm" }) File.Delete(_databasePath + suffix);
            if (disposing && _ownsKeyRing && Directory.Exists(_keyRingPath)) Directory.Delete(_keyRingPath, recursive: true);
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureAppConfiguration((context, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    {"JwtSettings:SecretKey", "SuperSecretTestKeyThatIsAtLeast256BitsLong!!"},
                    {"JwtSettings:Issuer", "Test"},
                    {"JwtSettings:Audience", "Test"},
                    {"JwtSettings:AccessTokenTtlMinutes", "15"},
                    {"JwtSettings:RefreshTokenTtlDays", "7"},
                    {"WalletSettings:RegistrationBonus", "100.00"},
                    {"DataProtection:KeyRingPath", _keyRingPath},
                    {"ConnectionStrings:DefaultConnection", "Data Source=" + _databasePath + ";Pooling=false"}
                });
            });

            builder.ConfigureServices(services =>
            {
                var descriptor = services.Single(d => d.ServiceType == typeof(DbContextOptions<NetFilmxDbContext>));
                services.Remove(descriptor);
                services.AddDbContext<NetFilmxDbContext>(options =>
                    options.UseSqlite("Data Source=" + _databasePath + ";Pooling=false"));
                if (_prepareDatabase)
                {
                    // Test setup owns this isolated file; the web startup only checks it.
                    using var db = new NetFilmxDbContext(new DbContextOptionsBuilder<NetFilmxDbContext>()
                        .UseSqlite("Data Source=" + _databasePath + ";Pooling=false").Options);
                    db.Database.Migrate();
                }
            });
        }
    }
}
