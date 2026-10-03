using System.Reflection;
using System.Text.RegularExpressions;
using NetFilmx_Storage.Context;

namespace NetFilmx_Web.Runtime;

public static class ReleaseHealth
{
    public static string Revision { get; } = GetRevision();

    private static string GetRevision()
    {
        var version = typeof(ReleaseHealth).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? "";
        var match = Regex.Match(version, @"\+([a-f0-9]{40})$");
        return match.Success ? match.Groups[1].Value : "development";
    }

    public static void MapReleaseHealth(this WebApplication app, bool uploadsEnabled)
    {
        app.MapGet("/health/live", (HttpContext context) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            return Results.Json(new { status = "live", revision = Revision });
        }).AllowAnonymous();
        app.MapGet("/health/ready", async (HttpContext context, NetFilmxDbContext db) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            using var deadline = CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted);
            deadline.CancelAfter(TimeSpan.FromSeconds(5));
            try
            {
                await ReleaseDatabase.EnsureReadyAsync(db, uploadsEnabled, deadline.Token);
                return Results.Json(new { status = "ready", revision = Revision });
            }
            catch
            {
                return Results.Json(new { status = "unavailable", revision = Revision }, statusCode: StatusCodes.Status503ServiceUnavailable);
            }
        }).AllowAnonymous();
    }
}
