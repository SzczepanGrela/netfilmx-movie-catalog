using NetFilmx_Storage.Context;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Web.Extensions
{
    public static partial class ServiceCollectionExtension
    {
        public static IServiceCollection AddNetFilmxServices(this IServiceCollection serviceCollection)
        {

            serviceCollection.AddTransient<IVideoRepository, VideoRepository>();
            serviceCollection.AddTransient<ICategoryRepository, CategoryRepository>();
            serviceCollection.AddTransient<ICommentRepository, CommentRepository>();
            serviceCollection.AddTransient<IUserRepository, UserRepository>();
            serviceCollection.AddTransient<ITagRepository, TagRepository>();
            serviceCollection.AddTransient<ISeriesRepository, SeriesRepository>();
            serviceCollection.AddTransient<ILikeRepository, LikeRepository>();
            serviceCollection.AddTransient<IVideoPurchaseRepository, VideoPurchaseRepository>();
            serviceCollection.AddTransient<ISeriesPurchaseRepository, SeriesPurchaseRepository>();
            serviceCollection.AddTransient<IUserSessionRepository, UserSessionRepository>();
            serviceCollection.AddTransient<IWalletTransactionRepository, WalletTransactionRepository>();


// DbContext is configured in Program.cs
            /*  serviceCollection.AddDbContext<NetFilmxDbContext>(options =>
          options.UseSqlServer("Server=ACER_NITRO_5;Database=NetFilmxDb_projekt_test;Trusted_Connection=True;TrustServerCertificate=True",
              x => x.MigrationsHistoryTable("__EFMigrationsHistory", "NetFilmx")).UseLazyLoadingProxies(), ServiceLifetime.Scoped);
             */

            return serviceCollection;


        }



    }
}
