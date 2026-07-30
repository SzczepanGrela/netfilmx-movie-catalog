using NetFilmx_Storage.Entities;

namespace NetFilmx_Web.Auth
{
    public interface IJwtTokenService
    {
        string GenerateAccessToken(User user);
        int? ValidateAccessToken(string token);
    }
}
