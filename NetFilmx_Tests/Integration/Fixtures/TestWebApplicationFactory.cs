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
                    {"ConnectionStrings:DefaultConnection", "Data Source=test_in_memory.db"}
                });
            });

            builder.ConfigureServices(services =>
            {
                var dbContextDescriptor = services.SingleOrDefault(
                    d => d.ServiceType ==
                        typeof(DbContextOptions<NetFilmxDbContext>));

                if (dbContextDescriptor != null)
                {
                    services.Remove(dbContextDescriptor);
                }

                services.AddDbContext<NetFilmxDbContext>(options =>
                {
                    options.UseInMemoryDatabase("InMemoryDbForTesting");
                });
            });
        }
    }
}
