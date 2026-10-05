using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.PostgreSql.Catalogue;

namespace NetFilmx_Web;

public static class CatalogueCommand
{
    public static async Task<int> RunAsync(string[] args)
    {
        if (args is not ["plan"] && args is not ["import", "--confirm-empty-database", "--confirm-reviewed-media"])
        {
            Console.Error.WriteLine("Usage: catalogue plan | catalogue import --confirm-empty-database --confirm-reviewed-media");
            return 2;
        }

        var plan = CataloguePlan.Load();
        if (args[0] == "plan")
        {
            Console.WriteLine(JsonSerializer.Serialize(new
            {
                videos = plan.Videos.Length,
                series = plan.Series.Length,
                pendingPlayback = plan.Videos.Where(v => v.PlaybackObjectKey is null).Select(v => v.Slug),
                entries = plan.Videos.Select(v => new { v.Slug, v.SourceObjectKey, v.PlaybackObjectKey })
            }));
            return 0;
        }

        try
        {
            plan.EnsureReadyForImport();
            var connection = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
            if (string.IsNullOrWhiteSpace(connection))
                throw new CatalogueImportException("Set ConnectionStrings__DefaultConnection for the separate empty PostgreSQL database.");
            var origin = Environment.GetEnvironmentVariable("CloudflareR2__PublicUrl");
            if (string.IsNullOrWhiteSpace(origin))
                throw new CatalogueImportException("Set CloudflareR2__PublicUrl to the reviewed media HTTPS origin.");
            await using var db = new NetFilmxDbContext(new DbContextOptionsBuilder<NetFilmxDbContext>()
                .UseNpgsql(connection, options => options.MigrationsAssembly(NetFilmxDatabaseOptions.PostgreSqlMigrationsAssembly))
                .Options);
            await CatalogueImporter.ImportAsync(db, plan, origin);
            Console.WriteLine($"Imported {plan.Videos.Length} videos and {plan.Series.Length} series.");
            return 0;
        }
        catch (CatalogueImportException error)
        {
            Console.Error.WriteLine(error.Message);
            return 1;
        }
        catch (Exception)
        {
            Console.Error.WriteLine("Catalogue import failed; verify database configuration and schema.");
            return 1;
        }
    }
}
