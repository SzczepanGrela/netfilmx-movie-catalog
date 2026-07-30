namespace NetFilmx_Web.Auth
{
    public interface IPasswordHasher
    {
        string HashPassword(string password);
        bool VerifyPassword(string password, string hash);
        bool NeedsRehash(string hash);
    }
}
