using Microsoft.AspNetCore.Localization;
using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;
using NetFilmx_Web.Extensions;
using System.Globalization;
using System.Reflection;
using Hangfire;
using Hangfire.PostgreSql;
using NetFilmx_Web.Security;
using NetFilmx_Web.Runtime;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

// Administrative operations exit before HTTP, Data Protection or workers.
if (args.Length > 0 && args[0] == "admin")
{
    Environment.ExitCode = await NetFilmx_Web.AdminCommand.RunAsync(args[1..]);
    return;
}
if (args.Length > 0 && args[0] == "catalogue")
{
    Environment.ExitCode = await NetFilmx_Web.CatalogueCommand.RunAsync(args[1..]);
    return;
}
if (args.Length > 0 && args[0] == "database")
{
    Environment.ExitCode = await NetFilmx_Web.DatabaseCommand.RunAsync(args[1..]);
    return;
}
if (args is ["healthcheck"] or ["smokecheck"])
{
    Environment.ExitCode = await RuntimeProbe.RunAsync(args[0] == "smokecheck");
    return;
}

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDurableDataProtection();
builder.Services.AddHttpSecurity(builder.Configuration);
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<NetFilmx_Web.Playback.PlaybackCatalogue>();
builder.Services.AddSingleton<NetFilmx_Web.Playback.PlaybackGrantIssuer>();
builder.Services.AddHttpClient<NetFilmx_Web.Playback.ITurnstileVerifier, NetFilmx_Web.Playback.TurnstileVerifier>(client =>
    client.DefaultRequestHeaders.UserAgent.ParseAdd("NetFilmxTurnstileVerifier/1.0"))
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false, UseCookies = false });
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 1_048_576);
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.ValueCountLimit = 256;
    options.ValueLengthLimit = 8192;
    options.MultipartHeadersLengthLimit = 8192;
});

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer();

builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IConfiguration>((options, configuration) =>
    {
        options.TokenValidationParameters = new NetFilmx_Service.Security.JwtConfiguration(configuration).ValidationParameters();

        // Extract token from cookie
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                // A retained JWT must not keep administrator access after role withdrawal.
                if (context.Principal?.IsInRole("Admin") != true) return;
                var claim = context.Principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(claim, System.Globalization.NumberStyles.None, CultureInfo.InvariantCulture, out var id))
                { context.Fail("Administrator identity is invalid."); return; }
                using var deadline = CancellationTokenSource.CreateLinkedTokenSource(context.HttpContext.RequestAborted);
                deadline.CancelAfter(TimeSpan.FromSeconds(3));
                try
                {
                    var db = context.HttpContext.RequestServices.GetRequiredService<NetFilmxDbContext>();
                    if (!await db.Users.AsNoTracking().AnyAsync(u => u.Id == id && u.Role == NetFilmx_Storage.Entities.UserRole.Admin, deadline.Token))
                        context.Fail("Administrator access was withdrawn.");
                }
                catch { context.Fail("Administrator access cannot be confirmed."); }
            },
            OnMessageReceived = context =>
            {
                if (context.Request.Cookies.ContainsKey("access_token"))
                {
                    context.Token = context.Request.Cookies["access_token"];
                }
                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                // If the request is for an API endpoint, return 401. Otherwise, redirect to Login.
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    context.HandleResponse();
                    context.Response.StatusCode = 401;
                }
                else
                {
                    context.HandleResponse();
                    var returnUrl = context.Request.Path + context.Request.QueryString;
                    context.Response.Redirect($"/auth/login?returnUrl={Uri.EscapeDataString(returnUrl)}");
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();// Add services to the container.
builder.Services.AddControllersWithViews(options =>
    options.Filters.Add(new Microsoft.AspNetCore.Mvc.AutoValidateAntiforgeryTokenAttribute()));
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "__Host-NetFilmx.Antiforgery";
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Strict;
});



builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblies(
    Assembly.GetExecutingAssembly()));

builder.Services.AddSingleton<NetFilmx_Service.Mappings.ICatalogueMapper, NetFilmx_Service.Mappings.CatalogueMapper>();

builder.Services.AddNetFilmxServices();

// Dynamically register open generic MediatR handlers (Queries)
var serviceAssembly = typeof(NetFilmx_Service.Query.Video.GetAllVideosQueryHandler<>).Assembly;

var dtoTypes = serviceAssembly.GetTypes()
    .Where(t => t.IsClass && !t.IsAbstract && t.Name.EndsWith("Dto"))
    .ToList();

var openGenericHandlers = serviceAssembly.GetTypes()
    .Where(t => t.IsClass && !t.IsAbstract && t.GetInterfaces()
        .Any(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(MediatR.IRequestHandler<,>)))
    .Where(t => t.IsGenericTypeDefinition)
    .ToList();

foreach (var handlerType in openGenericHandlers)
{
    foreach (var dtoType in dtoTypes)
    {
        try 
        {
            var closedHandlerType = handlerType.MakeGenericType(dtoType);
            var interfaceType = closedHandlerType.GetInterfaces()
                .First(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(MediatR.IRequestHandler<,>));
            builder.Services.AddTransient(interfaceType, closedHandlerType);
        }
        catch 
        {
            // Ignore combinations that violate generic constraints (if any)
        }
    }
}

// Dynamically register closed generic MediatR handlers (Commands)
var closedGenericHandlers = serviceAssembly.GetTypes()
    .Where(t => t.IsClass && !t.IsAbstract)
    .Select(t => new 
    { 
        Implementation = t, 
        Interfaces = t.GetInterfaces().Where(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(MediatR.IRequestHandler<,>)) 
    })
    .Where(t => t.Interfaces.Any() && !t.Implementation.IsGenericTypeDefinition);

foreach (var handler in closedGenericHandlers)
{
    foreach (var interfaceType in handler.Interfaces)
    {
        builder.Services.AddTransient(interfaceType, handler.Implementation);
    }
}


var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

bool isPostgreSql = connectionString?.Contains("Host=", StringComparison.OrdinalIgnoreCase) == true;

builder.Services.AddDbContext<NetFilmxDbContext>((services, options) =>
{
    var configured = services.GetRequiredService<IConfiguration>().GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(configured)) throw new InvalidOperationException("An explicit database connection is required.");
    NetFilmxDatabaseOptions.Configure(options, configured);
});

// Uploads are opt-in and need a shared private mount plus durable PostgreSQL jobs.
var uploadsEnabled = builder.Configuration.GetValue<bool>("Uploads:Enabled");
var workerEnabled = builder.Configuration.GetValue<bool>("Worker:Enabled");
if (workerEnabled && !uploadsEnabled) throw new InvalidOperationException("Worker:Enabled requires enabled uploads and their storage contract.");
var stagingRoot = builder.Configuration["Uploads:StagingPath"];
if (uploadsEnabled)
{
    if (string.IsNullOrWhiteSpace(builder.Configuration.GetConnectionString("DefaultConnection")))
        throw new InvalidOperationException("Uploads require an explicit PostgreSQL connection configuration.");
    if (!isPostgreSql) throw new InvalidOperationException("Uploads require PostgreSQL-backed jobs.");
    if (string.IsNullOrWhiteSpace(stagingRoot) || !Path.IsPathFullyQualified(stagingRoot))
        throw new InvalidOperationException("Uploads require an absolute private staging path.");
    var fullStagingRoot = Path.GetFullPath(stagingRoot).TrimEnd(Path.DirectorySeparatorChar);
    var contentRoot = Path.GetFullPath(builder.Environment.ContentRootPath).TrimEnd(Path.DirectorySeparatorChar);
    if (fullStagingRoot == contentRoot || fullStagingRoot.StartsWith(contentRoot + Path.DirectorySeparatorChar, StringComparison.Ordinal))
        throw new InvalidOperationException("Upload staging must be outside the application and public web directory.");
}
builder.Services.AddSingleton(new NetFilmx_Service.Processing.UploadStagingStore(uploadsEnabled, stagingRoot));
builder.Services.AddTransient<NetFilmx_Web.Services.VideoJobRunner>();
if (uploadsEnabled)
{
    builder.Services.AddHangfire((sp, configuration) =>
    {
        configuration.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer().UseRecommendedSerializerSettings()
            .UsePostgreSqlStorage(c => c.UseNpgsqlConnection(connectionString!), new PostgreSqlStorageOptions { PrepareSchemaIfNecessary = false });
    });
    if (workerEnabled)
    {
        builder.Services.AddHostedService<NetFilmx_Web.Services.SingletonUploadWorker>();
    }
}


var app = builder.Build();
// Reject invalid authentication configuration before migrations or accepting traffic.
_ = app.Services.GetRequiredService<Microsoft.Extensions.Options.IOptionsMonitor<JwtBearerOptions>>()
    .Get(JwtBearerDefaults.AuthenticationScheme);
_ = app.Services.GetRequiredService<Microsoft.Extensions.Options.IOptions<Microsoft.AspNetCore.Builder.ForwardedHeadersOptions>>().Value;
_ = app.Services.GetRequiredService<Microsoft.Extensions.Options.IOptions<Microsoft.AspNetCore.RateLimiting.RateLimiterOptions>>().Value;
app.Services.VerifyKeyRing();


if (uploadsEnabled)
{
    using var uploadScope = app.Services.CreateScope();
    if (!uploadScope.ServiceProvider.GetRequiredService<NetFilmx_Service.Storage.ICloudStorageService>().IsConfigured)
        throw new InvalidOperationException("Enabled uploads require complete R2 configuration.");
}

if (builder.Configuration.GetValue<bool>("Database:SeedDemoData"))
    throw new InvalidOperationException("Demo seeding is disabled. Use the explicit operator admin command.");
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NetFilmxDbContext>();
    using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(10));
    await ReleaseDatabase.EnsureReadyAsync(db, uploadsEnabled, deadline.Token);
}

// Configure the HTTP request pipeline.
app.UseForwardedHeaders();
app.Use(async (context, next) =>
{
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    if (context.Request.Path.StartsWithSegments("/playback") || context.Request.Path.StartsWithSegments("/auth"))
        context.Response.Headers.CacheControl = "no-store";
    await next();
});
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
}

// setting up polish culture, so validators can recognize numbers with , as decimal numbers

var defaultDateCulture = "pl-PL";
var ci = new CultureInfo(defaultDateCulture);
ci.NumberFormat.CurrencyDecimalSeparator = ",";
ci.NumberFormat.NumberDecimalSeparator = ",";
app.UseRequestLocalization(new RequestLocalizationOptions
{
    DefaultRequestCulture = new RequestCulture(ci),
    SupportedCultures = new List<CultureInfo> { ci },
    SupportedUICultures = new List<CultureInfo> { ci }
});

var fileProvider = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
fileProvider.Mappings[".m3u8"] = "application/vnd.apple.mpegurl";
fileProvider.Mappings[".ts"] = "video/mp2t";
fileProvider.Mappings[".mp4"] = "video/mp4";
fileProvider.Mappings[".webm"] = "video/webm";
fileProvider.Mappings[".mkv"] = "video/x-matroska";

app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = fileProvider
});

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapReleaseHealth(uploadsEnabled);

if (uploadsEnabled) app.UseHangfireDashboard("/admin/jobs", new DashboardOptions
{
    Authorization = new[] { new NetFilmx_Web.Filters.HangfireAuthorizationFilter() }
});

app.MapControllerRoute(
    name: "areas",
    pattern: "{area:exists}/{controller=Home}/{action=Index}/{id?}");

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();

public partial class Program { }
