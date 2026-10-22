using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using NetFilmx_Storage.Context;

namespace NetFilmx_Storage.PostgreSql;

public sealed class PostgreSqlDesignTimeFactory : IDesignTimeDbContextFactory<NetFilmxDbContext>
{
    public NetFilmxDbContext CreateDbContext(string[] args)
    {
        // Scaffolding does not connect. Database update requires an explicit
        // --connection argument; no production configuration is loaded here.
        var options = new DbContextOptionsBuilder<NetFilmxDbContext>()
            .UseNetFilmxDatabase("Host=localhost;Database=netfilmx_design;Username=netfilmx_design")
            .Options;
        return new NetFilmxDbContext(options);
    }
}
