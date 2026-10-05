namespace NetFilmx_Service.Security
{
    public interface IPasswordHasher
    {
        string HashPassword(string password);
        bool VerifyPassword(string password, string hash);
        bool NeedsRehash(string hash);
    }
}
