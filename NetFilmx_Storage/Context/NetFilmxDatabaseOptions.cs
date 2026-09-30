using Microsoft.EntityFrameworkCore;

namespace NetFilmx_Storage.Context;

public static class NetFilmxDatabaseOptions
{
    public const string PostgreSqlMigrationsAssembly = "NetFilmx_Storage.PostgreSql";

    public static DbContextOptionsBuilder<NetFilmxDbContext> UseNetFilmxDatabase(
        this DbContextOptionsBuilder<NetFilmxDbContext> options, string connectionString)
    {
        Configure(options, connectionString);
        return options;
    }

    public static void Configure(DbContextOptionsBuilder options, string connectionString)
    {
        if (connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase))
        {
            options.UseNpgsql(connectionString,
                postgres => postgres.MigrationsAssembly(PostgreSqlMigrationsAssembly));
        }
        else
        {
            options.UseSqlite(connectionString);
        }
    }
}
