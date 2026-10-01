using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;

namespace NetFilmx_Storage.PostgreSql.Catalogue;

public static class CatalogueImporter
{
    public static async Task ImportAsync(NetFilmxDbContext db, CataloguePlan plan, string publicBaseUrl,
        CancellationToken cancellationToken = default)
    {
        // Reject incomplete metadata before connecting or opening a transaction.
        plan.EnsureReadyForImport();
        var origin = CataloguePlan.ValidateBaseUrl(publicBaseUrl);
        if (!db.Database.IsNpgsql()) throw new CatalogueImportException("Import requires a separate PostgreSQL database.");
        if ((await db.Database.GetPendingMigrationsAsync(cancellationToken)).Any())
            throw new CatalogueImportException("Apply the reviewed PostgreSQL migrations before importing.");

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        // Serialize bootstrap attempts and exclude ordinary catalogue/account
        // writes during the empty check and insert. The application must still
        // be offline during bootstrap; this is not a live-catalogue merge tool.
        await db.Database.ExecuteSqlRawAsync("""
            SET LOCAL lock_timeout = '5s';
            LOCK TABLE "Videos", "Series", "Categories", "Tags", "Bundles", "Users"
            IN ACCESS EXCLUSIVE MODE;
            """, cancellationToken);
        if (await db.Videos.AnyAsync(cancellationToken) || await db.Series.AnyAsync(cancellationToken) ||
            await db.Categories.AnyAsync(cancellationToken) || await db.Tags.AnyAsync(cancellationToken) ||
            await db.Bundles.AnyAsync(cancellationToken) || await db.Users.AnyAsync(cancellationToken))
            throw new CatalogueImportException("Database is not empty; nothing was imported.");

        var series = plan.Series.ToDictionary(s => s.Slug,
            s => new Series(s.Name, s.Price, s.Description), StringComparer.Ordinal);
        db.Series.AddRange(series.Values);
        foreach (var item in plan.Videos)
        {
            // URLs reference retained keys, independent of generated database IDs.
            var video = new Video(item.Title, item.Description, item.Price,
                new Uri(origin, item.PlaybackObjectKey!).AbsoluteUri,
                new Uri(origin, item.PosterObjectKey).AbsoluteUri)
            {
                ReleaseYear = item.ReleaseYear,
                BackdropUrl = item.BackdropObjectKey is null ? null : new Uri(origin, item.BackdropObjectKey).AbsoluteUri
            };
            if (item.SeriesSlug is not null) video.Series.Add(series[item.SeriesSlug]);
            db.Videos.Add(video);
        }
        // Database-generated identities keep sequences in step. No seed accounts,
        // network calls, object writes, deletes or upload jobs belong in this tool.
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }
}
