using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;

namespace NetFilmx_Storage.Repositories
{
    public class SeriesRepository : ISeriesRepository
    {
        private readonly NetFilmxDbContext _context;

        public SeriesRepository(NetFilmxDbContext context)
        {
            _context = context;
        }

        public async Task<List<Series>> GetAllSeriesAsync()
        {
            return await _context.Series.ToListAsync();
        }

        public async Task<(IEnumerable<Series>, int totalCount)> GetPagedSeriesAsync(int pageNumber, int pageSize, string searchTerm)
        {
            var query = _context.Series.AsQueryable();

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                query = query.Where(s => s.Name.Contains(searchTerm) || (s.Description != null && s.Description.Contains(searchTerm)));
            }

            var count = await query.CountAsync();
            var items = await query.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync();

            return (items, count);
        }

        public async Task<List<Series>> GetSeriesByVideoIdAsync(int videoId)
        {
            if (!await _context.Videos.AnyAsync(v => v.Id == videoId))
            {
                throw new ArgumentException("Video not found");
            }

            return await _context.Videos.Where(v => v.Id == videoId).SelectMany(v => v.Series).ToListAsync();
        }

        public async Task<List<Series>> GetSeriesByUserIdAsync(int userId)
        {
            if (!await _context.Users.AnyAsync(u => u.Id == userId))
            {
                throw new ArgumentException("User not found");
            }
            return await _context.Series.Include(s => s.SeriesPurchases).Where(s => s.SeriesPurchases.Any(p => p.UserId == userId)).ToListAsync();
        }

        public async Task<Series> GetSeriesByIdAsync(int seriesId)
        {
            var series = await _context.Series.FindAsync(seriesId);
            return series ?? throw new ArgumentException("Series not found");
        }

        public async Task<Series> GetSeriesByNameAsync(string seriesName)
        {
            var series = await _context.Series.FirstOrDefaultAsync(c => c.Name == seriesName);
            return series ?? throw new ArgumentException("Series not found");
        }

        public async Task AddSeriesAsync(Series series)
        {
            if (series == null)
            {
                throw new ArgumentNullException(nameof(series), "Series cannot be null");
            }
            if (await IsSeriesExistAsync(series.Name))
            {
                throw new InvalidOperationException("A series with this name already exists");
            }
            await _context.Series.AddAsync(series);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateSeriesAsync(Series series)
        {
            if (series == null)
            {
                throw new ArgumentNullException(nameof(series), "Series cannot be null");
            }
            if (!await IsSeriesExistAsync(series.Id))
            {
                throw new ArgumentException("Series not found");
            }
            _context.Series.Attach(series);
            _context.Entry(series).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteSeriesAsync(int seriesId)
        {
            var series = await _context.Series.FindAsync(seriesId);
            if (series == null)
            {
                throw new ArgumentException("Series not found");
            }
            _context.Series.Remove(series);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> IsSeriesExistAsync(string seriesName)
        {
            return await _context.Series.AnyAsync(c => c.Name == seriesName);
        }

        public async Task<bool> IsSeriesExistAsync(int seriesId)
        {
            return await _context.Series.AnyAsync(c => c.Id == seriesId);
        }

        public async Task<int> GetVideosCountBySeriesIdAsync(int seriesId)
        {
            var series = await _context.Series.FindAsync(seriesId) ?? throw new ArgumentException("Series not found");
            return await _context.Series.Include(c => c.Videos).Where(s => s.Id == seriesId).SelectMany(s => s.Videos).CountAsync();
        }

        public async Task<int> GetVideosCountBySeriesNameAsync(string seriesName)
        {
            var series = await _context.Series.FirstOrDefaultAsync(c => c.Name == seriesName) ?? throw new ArgumentException("Series not found");
            return await _context.Series.Include(c => c.Videos).Where(s => s.Name == seriesName).SelectMany(s => s.Videos).CountAsync();
        }

        public async Task<List<Series>> GetSeriesByExcludedVideoIdAsync(int videoId)
        {
            var video = await _context.Videos.Include(v => v.Series).FirstOrDefaultAsync(v => v.Id == videoId)
                ?? throw new ArgumentException("Video not found");
            var allSeries = await _context.Series.ToListAsync();
            var excludedSeries = allSeries.Where(s => !video.Series.Any(vs => vs.Id == s.Id)).ToList();

            return excludedSeries;
        }


        public async Task<List<Series>> GetSeriesByExcludedUserIdAsync(int userId)
        {
            var user = await _context.Users.Include(u => u.SeriesPurchases).ThenInclude(sp => sp.Series).FirstOrDefaultAsync(u => u.Id == userId) 
                ?? throw new ArgumentException("User not found");
            var allSeries = await _context.Series.ToListAsync();
            var purchasedSeriesIds = user.SeriesPurchases.Select(sp => sp.SeriesId).ToList();
            var excludedSeries = allSeries.Where(s => !purchasedSeriesIds.Contains(s.Id)).ToList();

            return excludedSeries;
        }




    }
}
