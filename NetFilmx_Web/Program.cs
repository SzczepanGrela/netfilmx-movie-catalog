using Microsoft.AspNetCore.Localization;
using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;
using NetFilmx_Web.Extensions;
using System.Globalization;
using System.Reflection;

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


builder.Services.AddDbContext<NetFilmxDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));


var app = builder.Build();

// Migrate DB on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NetFilmxDbContext>();
    if (db.Database.IsRelational())
    {
        db.Database.Migrate();
        
        // Seed DB if empty
        if (!db.Users.Any())
        {
            var sqlFile = Path.Combine(AppContext.BaseDirectory, "InsertNetFilmxDb_SQLite.sql");
            if (File.Exists(sqlFile))
            {
                var sql = File.ReadAllText(sqlFile);
                db.Database.ExecuteSqlRaw(sql);
            }
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

app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "areas",
    pattern: "{area:exists}/{controller=Home}/{action=Index}/{id?}");

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();

public partial class Program { }
