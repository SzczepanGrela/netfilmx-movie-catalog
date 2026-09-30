using Microsoft.AspNetCore.Localization;
using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;
using NetFilmx_Web.Extensions;
using System.Globalization;
using System.Reflection;
using Hangfire;
using Hangfire.PostgreSql;
using Hangfire.MemoryStorage;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer();

builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IConfiguration>((options, configuration) =>
    {
        var secretKey = configuration["JwtSettings:SecretKey"];
        if (string.IsNullOrEmpty(secretKey))
        {
            throw new InvalidOperationException("JWT SecretKey is missing from configuration. Do not use hardcoded secrets.");
        }

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = configuration["JwtSettings:Issuer"],
            ValidAudience = configuration["JwtSettings:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
        };

        // Extract token from cookie
        options.Events = new JwtBearerEvents
        {
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
builder.Services.AddControllersWithViews();



builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblies(
    Assembly.GetExecutingAssembly()));

builder.Services.AddAutoMapper(typeof(NetFilmx_Service.Mappings.VideoMappingProfile).Assembly);

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


var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Port=5432;Database=netfilmx_db;Username=netfilmx_user;Password=netfilmx_pass;Include Error Detail=true";

bool isPostgreSql = connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase);

builder.Services.AddDbContext<NetFilmxDbContext>(options =>
{
    NetFilmxDatabaseOptions.Configure(options, connectionString);
});

// Configure Hangfire
builder.Services.AddHangfire((sp, configuration) =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var conn = config.GetConnectionString("DefaultConnection") ?? "";
    bool usePg = conn.Contains("Host=", StringComparison.OrdinalIgnoreCase);

    configuration
        .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings();

    if (usePg && !builder.Environment.IsEnvironment("Testing"))
    {
        try
        {
            configuration.UsePostgreSqlStorage(c => c.UseNpgsqlConnection(conn));
        }
        catch
        {
            configuration.UseMemoryStorage();
        }
    }
    else
    {
        configuration.UseMemoryStorage();
    }
});

// Add the processing server as IHostedService
builder.Services.AddHangfireServer();


var app = builder.Build();

var seedDemoData = builder.Configuration.GetValue<bool>("Database:SeedDemoData");
if (seedDemoData && !app.Environment.IsDevelopment())
{
    throw new InvalidOperationException("Demo data may only be seeded in Development.");
}

// Migrate DB on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NetFilmxDbContext>();
    if (db.Database.IsRelational())
    {
        try
        {
            db.Database.Migrate();
            
            // Demo accounts/catalogue are opt-in and never production bootstrap.
            if (seedDemoData && !db.Users.Any())
            {
                var sqlFileName = isPostgreSql ? "InsertNetFilmxDb_PostgreSQL.sql" : "InsertNetFilmxDb_SQLite.sql";
                var sqlFile = Path.Combine(AppContext.BaseDirectory, sqlFileName);
                if (!File.Exists(sqlFile))
                {
                    sqlFile = Path.Combine(Directory.GetCurrentDirectory(), "..", "SQL", sqlFileName);
                }

                if (File.Exists(sqlFile))
                {
                    var sql = File.ReadAllText(sqlFile);
                    db.Database.ExecuteSqlRaw(sql);
                }
            }
        }
        catch (Exception ex)
        {
            var logger = scope.ServiceProvider.GetService<ILogger<Program>>();
            logger?.LogError(ex, "Błąd podczas automatycznej migracji bazy danych.");
            throw;
        }
    }
}

// Configure the HTTP request pipeline.
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

app.UseHangfireDashboard("/admin/jobs", new DashboardOptions
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
