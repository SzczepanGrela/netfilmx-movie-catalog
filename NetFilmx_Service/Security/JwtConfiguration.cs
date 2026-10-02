using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace NetFilmx_Service.Security;

// Shared validation for token issuance and both validation paths. Never log key material.
public sealed class JwtConfiguration
{
    private readonly SymmetricSecurityKey _key;
    public string Issuer { get; }
    public string Audience { get; }
    public int AccessTokenTtlMinutes { get; }

    public JwtConfiguration(IConfiguration configuration)
    {
        var secret = configuration["JwtSettings:SecretKey"];
        if (string.IsNullOrWhiteSpace(secret) || Encoding.UTF8.GetByteCount(secret) < 32)
            throw new InvalidOperationException("JwtSettings:SecretKey must contain at least 32 bytes of secret key material.");
        Issuer = Required(configuration, "Issuer");
        Audience = Required(configuration, "Audience");
        var ttl = configuration["JwtSettings:AccessTokenTtlMinutes"];
        AccessTokenTtlMinutes = ttl == null ? 15 : int.TryParse(ttl, out var minutes) ? minutes : 0;
        if (AccessTokenTtlMinutes is < 1 or > 60)
            throw new InvalidOperationException("JwtSettings:AccessTokenTtlMinutes must be between 1 and 60.");
        _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
    }

    private static string Required(IConfiguration configuration, string name) =>
        !string.IsNullOrWhiteSpace(configuration["JwtSettings:" + name])
            ? configuration["JwtSettings:" + name]!
            : throw new InvalidOperationException($"JwtSettings:{name} is required.");

    public SigningCredentials SigningCredentials() => new(_key, SecurityAlgorithms.HmacSha256);

    public TokenValidationParameters ValidationParameters() => new()
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = Issuer,
        ValidAudience = Audience,
        IssuerSigningKey = _key,
        ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
        ClockSkew = TimeSpan.Zero
    };
}
