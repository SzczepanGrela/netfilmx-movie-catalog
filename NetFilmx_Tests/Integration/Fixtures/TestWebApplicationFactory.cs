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
        private readonly string _databasePath = Path.Combine(Path.GetTempPath(), "netfilmx-auth-test-" + Guid.NewGuid().ToString("N") + ".db");

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            if (disposing)
                foreach (var suffix in new[] { "", "-wal", "-shm" }) File.Delete(_databasePath + suffix);
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
                    {"ConnectionStrings:DefaultConnection", "Data Source=" + _databasePath + ";Pooling=false"}
                });
            });

            builder.ConfigureServices(services =>
            {
                var descriptor = services.Single(d => d.ServiceType == typeof(DbContextOptions<NetFilmxDbContext>));
                services.Remove(descriptor);
                services.AddDbContext<NetFilmxDbContext>(options =>
                    options.UseSqlite("Data Source=" + _databasePath + ";Pooling=false"));
            });
        }
    }
}
