using NetFilmx_Web.Runtime;

namespace NetFilmx_Web;

public static class DatabaseCommand
{
    public static async Task<int> RunAsync(string[] args)
    {
        if (args is not ["migrate", "--confirm-reviewed-migrations"] &&
            args is not ["migrate", "--confirm-reviewed-migrations", "--prepare-upload-queue"])
        {
            Console.Error.WriteLine("Usage: database migrate --confirm-reviewed-migrations [--prepare-upload-queue]");
            return 2;
        }
        var connection = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
        if (string.IsNullOrWhiteSpace(connection))
        {
            Console.Error.WriteLine("Set ConnectionStrings__DefaultConnection for the separately prepared target database.");
            return 1;
        }
        using var cancellation = new CancellationTokenSource();
        ConsoleCancelEventHandler stop = (_, eventArgs) => { eventArgs.Cancel = true; cancellation.Cancel(); };
        Console.CancelKeyPress += stop;
        try
        {
            await ReleaseDatabase.MigrateAsync(connection, args.Length == 3, cancellation.Token);
            Console.WriteLine("Reviewed database migrations applied; no HTTP server or workers started.");
            return 0;
        }
        catch
        {
            // Provider exceptions can contain connection details and SQL values.
            Console.Error.WriteLine("Release migration failed or timed out. Check database access, migration ownership and reviewed schema before retrying.");
            return 1;
        }
        finally { Console.CancelKeyPress -= stop; }
    }
}
