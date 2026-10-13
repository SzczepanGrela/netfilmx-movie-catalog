using System.Net;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;
using NetFilmx_Storage.PostgreSql.Catalogue;
using Npgsql;

internal static class Entry
{
    private const string MediaOrigin = "https://media.example.test/";

    public static async Task<int> Main(string[] args)
    {
        try
        {
            if (args is ["gateway"])
            {
                await Gateway();
                return 0;
            }
            using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(45));
            var connection = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
                ?? throw new InvalidOperationException("Missing isolated fixture connection.");
            await using var db = new NetFilmxDbContext(new DbContextOptionsBuilder<NetFilmxDbContext>()
                .UseNpgsql(connection, o => o.MigrationsAssembly(NetFilmxDatabaseOptions.PostgreSqlMigrationsAssembly)).Options);
            var plan = CataloguePlan.Load();
            // This completed plan is synthetic. The shipped resource remains unchanged/null.
            var fixture = plan with { Videos = plan.Videos.Select(v => v with
            {
                PlaybackObjectKey = $"videos/qualification/{v.Slug}.mp4"
            }).ToArray() };
            switch (args.Single())
            {
                case "import-fixture":
                    await CatalogueImporter.ImportAsync(db, fixture, MediaOrigin, deadline.Token);
                    Require(await db.Videos.CountAsync(deadline.Token) == 7, "Video count");
                    Require(await db.Users.CountAsync(deadline.Token) == 0, "No imported accounts");
                    var series = await db.Series.Include(s => s.Videos).SingleAsync(deadline.Token);
                    Require(series.Name == "Caminandes" && series.Videos.Count == 3, "Episode links");
                    var maximum = await db.Videos.MaxAsync(v => v.Id, deadline.Token);
                    await using (var tx = await db.Database.BeginTransactionAsync(deadline.Token))
                    {
                        var next = new Video("Synthetic sequence check", "Fixture", 0,
                            MediaOrigin + "videos/qualification/sequence.mp4", MediaOrigin + "posters/sequence.jpg");
                        db.Videos.Add(next);
                        await db.SaveChangesAsync(deadline.Token);
                        Require(next.Id > maximum, "Generated sequence");
                        await tx.RollbackAsync(deadline.Token);
                    }
                    Console.WriteLine("{\"fixture_import\":true,\"videos\":7,\"series\":1,\"episode_links\":3,\"sequence\":true}");
                    break;
                case "refuse-repeat":
                    await Refuse(db, fixture, deadline.Token);
                    Require(await db.Videos.CountAsync(deadline.Token) == 7, "Repeat preserves catalogue");
                    Console.WriteLine("{\"repeat_refused\":true}");
                    break;
                case "refuse-account":
                    db.Users.Add(new User("fixture_existing", "existing@example.test", "unused-synthetic-fixture"));
                    await db.SaveChangesAsync(deadline.Token);
                    await Refuse(db, fixture, deadline.Token);
                    Require(await db.Videos.CountAsync(deadline.Token) == 0 && await db.Users.CountAsync(deadline.Token) == 1,
                        "Nonempty account preserved without partial catalogue");
                    Console.WriteLine("{\"nonempty_account_refused\":true,\"videos\":0,\"users\":1}");
                    break;
                case "counts":
                    var counts = new
                    {
                        videos = await db.Videos.CountAsync(deadline.Token),
                        series = await db.Series.CountAsync(deadline.Token),
                        episode_links = await db.Set<Dictionary<string, object>>("VideoSeries").CountAsync(deadline.Token),
                        users = await db.Users.CountAsync(deadline.Token),
                        sessions = await db.UserSessions.CountAsync(deadline.Token),
                        comments = await db.Comments.CountAsync(deadline.Token),
                        likes = await db.Likes.CountAsync(deadline.Token),
                        purchases = await db.VideoPurchases.CountAsync(deadline.Token) + await db.SeriesPurchases.CountAsync(deadline.Token)
                            + await db.BundlePurchases.CountAsync(deadline.Token),
                        upload_intents = await db.Videos.CountAsync(v => v.SourceUploadId != null || v.UploadJobId != null, deadline.Token)
                    };
                    Console.WriteLine(JsonSerializer.Serialize(counts));
                    break;
                default:
                    throw new InvalidOperationException("Unknown qualification command.");
            }
            return 0;
        }
        catch (Exception e)
        {
            // No connection strings, rows, keys, cookies or raw provider exception text.
            Console.Error.WriteLine($"Qualification failed ({e.GetType().Name}).");
            return 1;
        }
    }

    private static async Task Refuse(NetFilmxDbContext db, CataloguePlan fixture, CancellationToken token)
    {
        try { await CatalogueImporter.ImportAsync(db, fixture, MediaOrigin, token); }
        catch (CatalogueImportException) { return; }
        throw new InvalidOperationException("Import unexpectedly accepted existing data.");
    }

    private static void Require(bool condition, string check)
    {
        if (!condition) throw new InvalidOperationException(check);
    }

    private static async Task Gateway()
    {
        var builder = WebApplication.CreateSlimBuilder();
        builder.Logging.ClearProviders();
        builder.WebHost.ConfigureKestrel(o => o.ListenAnyIP(8443, listen => listen.UseHttps(
            X509CertificateLoader.LoadPkcs12FromFile("/tls/server.pfx", "qualification"))));
        var app = builder.Build();
        using var client = new HttpClient(new SocketsHttpHandler { AllowAutoRedirect = false, UseCookies = false })
            { Timeout = TimeSpan.FromSeconds(10) };
        app.Run(async context =>
        {
            var instance = context.Request.Headers["X-Qualification-Instance"].ToString();
            if (instance is not ("a" or "b")) { context.Response.StatusCode = 400; return; }
            using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method),
                $"http://web-{instance}:8080{context.Request.Path}{context.Request.QueryString}");
            if (context.Request.ContentLength is > 0)
                request.Content = new StreamContent(context.Request.Body);
            foreach (var header in context.Request.Headers)
            {
                if (header.Key.Equals("Host", StringComparison.OrdinalIgnoreCase) ||
                    header.Key.StartsWith("X-Forwarded-", StringComparison.OrdinalIgnoreCase) ||
                    header.Key.Equals("X-Qualification-Instance", StringComparison.OrdinalIgnoreCase) ||
                    header.Key.Equals("Connection", StringComparison.OrdinalIgnoreCase)) continue;
                if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
            }
            request.Headers.Host = "netfilmx.test";
            request.Headers.Add("X-Forwarded-Proto", "https");
            request.Headers.Add("X-Forwarded-For", "192.0.2.10");
            try
            {
                using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, context.RequestAborted);
                context.Response.StatusCode = (int)response.StatusCode;
                foreach (var header in response.Headers.Concat(response.Content.Headers))
                {
                    if (header.Key.Equals("Transfer-Encoding", StringComparison.OrdinalIgnoreCase) ||
                        header.Key.Equals("Connection", StringComparison.OrdinalIgnoreCase)) continue;
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
            }
            catch (HttpRequestException) { context.Response.StatusCode = 503; }
        });
        await app.RunAsync();
    }
}
