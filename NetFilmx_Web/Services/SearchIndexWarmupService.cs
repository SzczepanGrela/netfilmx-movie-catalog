using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NetFilmx_Service.Search;
using NetFilmx_Storage.Context;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace NetFilmx_Web.Services
{
    public class SearchIndexWarmupService : IHostedService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ISearchEngine _searchEngine;
        private readonly ILogger<SearchIndexWarmupService> _logger;

        public SearchIndexWarmupService(IServiceProvider serviceProvider, ISearchEngine searchEngine, ILogger<SearchIndexWarmupService> logger)
        {
            _serviceProvider = serviceProvider;
            _searchEngine = searchEngine;
            _logger = logger;
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Rozpoczynanie indeksowania w pamięci RAM (QWERTY Search Engine Warmup)...");
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<NetFilmxDbContext>();

                var videos = await dbContext.Videos
                    .Include(v => v.Translations)
                    .Include(v => v.Categories)
                        .ThenInclude(c => c.Translations)
                    .Include(v => v.Tags)
                        .ThenInclude(t => t.Translations)
                    .ToListAsync(cancellationToken);

                var series = await dbContext.Series
                    .Include(s => s.Translations)
                    .ToListAsync(cancellationToken);

                _searchEngine.Warmup(videos, series);
                _logger.LogInformation("Zindeksowano pomyślnie {VideoCount} filmów i {SeriesCount} serii w silniku wyszukiwania QWERTY.", videos.Count, series.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Błąd podczas warmupowania indeksu wyszukiwarki QWERTY.");
            }
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
