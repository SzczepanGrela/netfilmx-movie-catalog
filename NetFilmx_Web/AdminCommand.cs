using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using NetFilmx_Service.Security;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;
using NetFilmx_Web.Runtime;

namespace NetFilmx_Web;

// Local operator process only. No HTTP bootstrap, promotion, seed or default password.
public static class AdminCommand
{
    public static async Task<int> RunAsync(string[] args, IConfiguration? suppliedConfiguration = null, TextReader? passwordInput = null)
    {
        if (args is not ["create", "--confirm-operator-access", "--confirm-create-admin"])
        {
            Console.Error.WriteLine("Usage: admin create --confirm-operator-access --confirm-create-admin (password on redirected stdin)");
            return 2;
        }
        if (passwordInput is null && !Console.IsInputRedirected)
        {
            Console.Error.WriteLine("A private redirected password input is required.");
            return 2;
        }
        try
        {
            var config = suppliedConfiguration ?? new ConfigurationBuilder().AddEnvironmentVariables().Build();
            var username = config["AdminProvisioning:Username"] ?? "";
            var email = config["AdminProvisioning:Email"] ?? "";
            var connection = config.GetConnectionString("DefaultConnection");
            var input = passwordInput ?? Console.In;
            // Bound input before allocating an unbounded line. Only one password line is accepted.
            var buffer = new char[130]; int length = 0, value;
            while ((value = input.Read()) != -1 && value != '\n')
            {
                if (length == buffer.Length) throw new InvalidOperationException();
                buffer[length++] = (char)value;
            }
            var password = new string(buffer, 0, length).TrimEnd('\r');
            Array.Clear(buffer);
            if (input.Read() != -1 || !Regex.IsMatch(username, "^[a-zA-Z0-9_-]{3,50}$")
                || email.Length > 50 || !new EmailAddressAttribute().IsValid(email)
                || password.Length is < 12 or > 128 || password.Any(char.IsControl) || string.IsNullOrWhiteSpace(connection))
                throw new InvalidOperationException();
            await using var db = new NetFilmxDbContext(new DbContextOptionsBuilder<NetFilmxDbContext>().UseNetFilmxDatabase(connection).Options);
            using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            await ReleaseDatabase.EnsureReadyAsync(db, false, deadline.Token);
            await using var transaction = await db.Database.BeginTransactionAsync(deadline.Token);
            if (await db.Users.AnyAsync(u => u.Username == username || u.Email == email, deadline.Token))
                throw new InvalidOperationException();
            var user = new User(username, email, new Argon2idPasswordHasher().HashPassword(password), UserRole.Admin);
            db.Users.Add(user);
            await db.SaveChangesAsync(deadline.Token);
            await transaction.CommitAsync(deadline.Token);
            Console.WriteLine("Administrator created. No HTTP server or workers started.");
            return 0;
        }
        catch
        {
            Console.Error.WriteLine("Admin creation refused or failed; verify reviewed database, unique identity and private input. Existing users are never promoted.");
            return 1;
        }
    }
}
