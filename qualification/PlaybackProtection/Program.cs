using System.Net;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.PostgreSql.Catalogue;
using NetFilmx_Tests.Integration.Fixtures;
using NetFilmx_Web.Playback;
using Npgsql;

namespace NetFilmxQualification;
internal static class ProtectionFixture
{
    public static async Task Main(string[] args)
    {
        if (args.Length != 2) throw new InvalidOperationException("Supply owned fixture output and HTTPS media origin.");
        var output=Path.GetFullPath(args[0]);
        if (!output.Contains(Path.DirectorySeparatorChar+"artifacts"+Path.DirectorySeparatorChar)) throw new InvalidOperationException("Private ignored fixture directory required.");
        var clock=new FileClock(Path.Combine(output,"clock.txt"));
        using var rsa=RSA.Create(2048);var key=Path.Combine(output,"signing.pem");
        File.WriteAllText(key,rsa.ExportPkcs8PrivateKeyPem());
        if(!OperatingSystem.IsWindows())File.SetUnixFileMode(key,UnixFileMode.UserRead|UnixFileMode.UserWrite);
        using var certificate=X509CertificateLoader.LoadPkcs12FromFile(Path.Combine(output,"server.pfx"),"qualification");
        var adminConnection=new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("NETFILMX_QUALIFICATION_POSTGRES")
            ?? throw new InvalidOperationException("Owned local fixture PG required."));
        if(adminConnection.Host!="127.0.0.1"||adminConnection.Database!="playback_qualification") throw new InvalidOperationException("Only the owned loopback fixture is allowed.");
        await using(var bootstrap=new NetFilmxDbContext(new DbContextOptionsBuilder<NetFilmxDbContext>().UseNetFilmxDatabase(adminConnection.ConnectionString).Options))
        {
            await bootstrap.Database.MigrateAsync();
            await bootstrap.Database.ExecuteSqlRawAsync("""
                CREATE ROLE fixture_runtime LOGIN PASSWORD 'local-fixture-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
                GRANT CONNECT ON DATABASE playback_qualification TO fixture_runtime;
                GRANT USAGE ON SCHEMA public TO fixture_runtime;
                GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO fixture_runtime;
                GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO fixture_runtime;
                REVOKE INSERT,UPDATE,DELETE ON TABLE "__EFMigrationsHistory" FROM fixture_runtime;
                """);
        }
        var runtimeConnection=new NpgsqlConnectionStringBuilder(adminConnection.ConnectionString){Username="fixture_runtime",Password="local-fixture-only"}.ConnectionString;
        using var factory=new Fixture(args[1],key,clock,runtimeConnection);
        factory.Siteverify.Clock=clock;
        factory.UseKestrel(options=>options.Listen(IPAddress.Loopback,0,listen=>listen.UseHttps(certificate)));
        using var client=factory.CreateClient(new(){AllowAutoRedirect=false});
        using(var scope=factory.Services.CreateScope())
        {
            var db=scope.ServiceProvider.GetRequiredService<NetFilmxDbContext>();
            await CatalogueImporter.ImportAsync(db,CataloguePlan.Load(),args[1]);
        }
        using var query=factory.Services.CreateScope();var database=query.ServiceProvider.GetRequiredService<NetFilmxDbContext>();
        var film=await database.Videos.SingleAsync(v=>v.Title=="Sintel");
        var plain=await database.Videos.SingleAsync(v=>v.Title=="Caminandes: Llama Drama");
        var provision=new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>
            { ["ConnectionStrings:DefaultConnection"]=runtimeConnection,["AdminProvisioning:Username"]="qualification_admin",["AdminProvisioning:Email"]="admin@example.test" }).Build();
        if(await NetFilmx_Web.AdminCommand.RunAsync(["create","--confirm-operator-access","--confirm-create-admin"],provision,new StringReader("Qualification123!"))!=0)throw new InvalidOperationException("Fixture admin setup failed.");
        var p=rsa.ExportParameters(false);var catalogue=factory.Services.GetRequiredService<PlaybackCatalogue>();
        var address=factory.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
        var identity=new{appOrigin=address.Replace("127.0.0.1","localhost"),videoId=film.Id,plainId=plain.Id,version=catalogue.Data.Version,
            jwks=new{keys=new[]{new{kty="RSA",alg="RS256",use="sig",kid="fixture",n=Base64UrlEncoder.Encode(p.Modulus),e=Base64UrlEncoder.Encode(p.Exponent)}}}};
        File.WriteAllText(Path.Combine(output,"app.json"),JsonSerializer.Serialize(identity));
        Console.WriteLine("Fixture ready");
        await Console.In.ReadLineAsync();
    }
    private sealed class FileClock(string file):TimeProvider
    {
        public override DateTimeOffset GetUtcNow()=>DateTimeOffset.UtcNow.AddSeconds(double.Parse(File.ReadAllText(file),global::System.Globalization.CultureInfo.InvariantCulture));
    }
    private sealed class Fixture(string media,string key,TimeProvider clock,string connection):TestWebApplicationFactory<global::Program>(null,null,false)
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.ConfigureLogging(logging=>logging.ClearProviders());
            builder.ConfigureAppConfiguration((_,config)=>config.AddInMemoryCollection(new Dictionary<string,string?>
            {
                ["Playback:Enabled"]="true",["Playback:Issuer"]="qualification",["Playback:Audience"]="qualification-media",["Playback:KeyId"]="fixture",
                ["Playback:SigningKeyPath"]=key,["Playback:GatewayUrl"]=media,["CloudflareR2:PublicUrl"]=media,
                ["ConnectionStrings:DefaultConnection"]=connection,["Uploads:Enabled"]="false",["Worker:Enabled"]="false",["Database:SeedDemoData"]="false"
            }));
            builder.ConfigureServices(services=>
            {
                services.AddSingleton(clock);
                foreach(var descriptor in services.Where(d=>d.ServiceType==typeof(DbContextOptions<NetFilmxDbContext>)||d.ServiceType==typeof(Microsoft.EntityFrameworkCore.Infrastructure.IDbContextOptionsConfiguration<NetFilmxDbContext>)).ToArray())services.Remove(descriptor);
                services.AddDbContext<NetFilmxDbContext>(options=>NetFilmxDatabaseOptions.Configure(options,connection));
            });
        }
    }
}
