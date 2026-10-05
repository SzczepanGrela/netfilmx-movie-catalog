using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using NetFilmx_Storage.Entities;
using Microsoft.Extensions.Configuration;

namespace NetFilmx_Service.Security
{
    public class JwtTokenService : IJwtTokenService
    {
        private readonly JwtConfiguration _settings;

        public JwtTokenService(IConfiguration configuration)
        {
            _settings = new JwtConfiguration(configuration);
        }

        public string GenerateAccessToken(User user)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _settings.Issuer,
                audience: _settings.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_settings.AccessTokenTtlMinutes),
                signingCredentials: _settings.SigningCredentials());

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public int? ValidateAccessToken(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
                return null;

            try
            {
                var principal = new JwtSecurityTokenHandler().ValidateToken(token, _settings.ValidationParameters(), out _);
                var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (int.TryParse(userIdClaim, out int userId))
                {
                    return userId;
                }

                return null;
            }
            catch
            {
                return null;
            }
        }
    }
}
