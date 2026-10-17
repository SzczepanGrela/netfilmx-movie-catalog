using NetFilmx_Storage.Entities;

namespace NetFilmx_Service.Security
{
    public interface IJwtTokenService
    {
        string GenerateAccessToken(User user);
        int? ValidateAccessToken(string token);
    }
}
