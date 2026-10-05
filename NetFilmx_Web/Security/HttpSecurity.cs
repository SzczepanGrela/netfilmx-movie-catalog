using System.Globalization;
using System.Net;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc.Controllers;

namespace NetFilmx_Web.Security;

public static class HttpSecurity
{
    public static IServiceCollection AddHttpSecurity(this IServiceCollection services, IConfiguration configuration)
    {
        foreach (var name in new[] { "ForwardedHeaders_Enabled", "ASPNETCORE_FORWARDEDHEADERS_ENABLED", "DOTNET_FORWARDEDHEADERS_ENABLED" })
            if (configuration.GetValue<bool>(name))
                throw new InvalidOperationException("Automatic trust of forwarded headers is disabled. Configure exact Proxy:KnownProxies instead.");

        services.Configure<ForwardedHeadersOptions>(options => ConfigureForwarding(options, configuration));
        services.AddRateLimiter(options =>
        {
            var window = TimeSpan.FromSeconds(Positive(configuration, "WindowSeconds", 60, 3600));
            var permits = new Dictionary<string, int>
            {
                ["Login"] = Positive(configuration, "Login", 10, 1000),
                ["Register"] = Positive(configuration, "Register", 5, 1000),
                ["Refresh"] = Positive(configuration, "Refresh", 30, 1000)
            };
            var writePermits = Positive(configuration, "Write", 60, 1000);
            RateLimitPartition<string> Window(string key, int limit) => RateLimitPartition.GetFixedWindowLimiter(key, _ => new()
            {
                PermitLimit = limit, Window = window, AutoReplenishment = true, QueueLimit = 0
            });
            var authentication = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                var action = AuthAction(context);
                return action == null ? RateLimitPartition.GetNoLimiter("read-or-write")
                    : Window(action + ":" + ClientAddress(context), permits[action]);
            });
            var writes = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                if (IsSafe(context) || AuthAction(context) != null || context.GetEndpoint() == null)
                    return RateLimitPartition.GetNoLimiter("read-or-auth");
                var user = context.User.Identity?.IsAuthenticated == true ? context.User.FindFirstValue(ClaimTypes.NameIdentifier) : null;
                return Window(user == null ? "ip:" + ClientAddress(context) : "user:" + user, writePermits);
            });
            var authenticationWork = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                AuthAction(context) is "Login" or "Register"
                    ? RateLimitPartition.GetConcurrencyLimiter("password-work", _ => new() { PermitLimit = 2, QueueLimit = 0 })
                    : RateLimitPartition.GetNoLimiter("other-work"));
            var uploads = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                var action = context.GetEndpoint()?.Metadata.GetMetadata<ControllerActionDescriptor>();
                return !IsSafe(context) && action is { ControllerName: "Video", ActionName: "Add" }
                    && action.RouteValues.TryGetValue("area", out var area) && area == "Admin"
                    ? RateLimitPartition.GetConcurrencyLimiter("upload-work", _ => new() { PermitLimit = 1, QueueLimit = 0 })
                    : RateLimitPartition.GetNoLimiter("other-work");
            });
            options.GlobalLimiter = PartitionedRateLimiter.CreateChained(authentication, writes, authenticationWork, uploads);
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, token) =>
            {
                var seconds = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retry)
                    ? Math.Max(1, (int)Math.Ceiling(retry.TotalSeconds)) : 1;
                context.HttpContext.Response.Headers.RetryAfter = seconds.ToString(CultureInfo.InvariantCulture);
                context.HttpContext.Response.Headers.CacheControl = "no-store";
                await context.HttpContext.Response.WriteAsJsonAsync(new { error = "rate_limit_exceeded", retry_after = seconds }, token);
            };
        });
        return services;
    }

    private static void ConfigureForwarding(ForwardedHeadersOptions options, IConfiguration configuration)
    {
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
        foreach (var entry in configuration.GetSection("Proxy:KnownProxies").GetChildren())
        {
            if (entry.Value == null || entry.Value.Contains('%') || !IPAddress.TryParse(entry.Value, out var address)
                || address.Equals(IPAddress.Any) || address.Equals(IPAddress.IPv6Any))
                throw new InvalidOperationException("Proxy:KnownProxies must contain exact IP addresses, without wildcards or networks.");
            options.KnownProxies.Add(address.IsIPv4MappedToIPv6 ? address.MapToIPv4() : address);
        }
        var hops = configuration.GetValue<int?>("Proxy:ForwardLimit") ?? 2;
        if (hops is < 1 or > 4) throw new InvalidOperationException("Proxy:ForwardLimit must be between 1 and 4.");
        options.ForwardLimit = hops;
        // Active forwarding with both trust collections empty would trust every peer.
        options.ForwardedHeaders = options.KnownProxies.Count == 0 ? ForwardedHeaders.None
            : ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    }

    private static int Positive(IConfiguration configuration, string name, int fallback, int maximum)
    {
        var value = configuration.GetValue<int?>("RateLimits:" + name) ?? fallback;
        return value is >= 1 && value <= maximum ? value
            : throw new InvalidOperationException($"RateLimits:{name} must be between 1 and {maximum}.");
    }

    private static bool IsSafe(HttpContext context) => HttpMethods.IsGet(context.Request.Method)
        || HttpMethods.IsHead(context.Request.Method) || HttpMethods.IsOptions(context.Request.Method);

    private static string? AuthAction(HttpContext context)
    {
        var action = context.GetEndpoint()?.Metadata.GetMetadata<ControllerActionDescriptor>();
        return !IsSafe(context) && action?.ControllerName == "Auth" && action.ActionName is "Login" or "Register" or "Refresh"
            ? action.ActionName : null;
    }

    private static string ClientAddress(HttpContext context)
    {
        var address = context.Connection.RemoteIpAddress;
        return (address?.IsIPv4MappedToIPv6 == true ? address.MapToIPv4() : address)?.ToString() ?? "unknown";
    }
}
