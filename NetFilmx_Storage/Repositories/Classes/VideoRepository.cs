using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;

namespace NetFilmx_Storage.Repositories
{
    public class VideoRepository : IVideoRepository
    {
        private readonly NetFilmxDbContext _context;

        public VideoRepository(NetFilmxDbContext context)
        {
            _context = context;
        }

        public async Task<List<Video>> GetAllVideosAsync()
        {
            return await _context.Videos.ToListAsync();
        }

        public async Task<(IEnumerable<Video>, int totalCount)> GetPagedVideosAsync(int pageNumber, int pageSize, string searchTerm)
        {
            var query = _context.Videos.AsQueryable();

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                query = query.Where(v => v.Title.Contains(searchTerm) || (v.Description != null && v.Description.Contains(searchTerm)));
            }

            var count = await query.CountAsync();
            var items = await query.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync();

            return (items, count);
        }

        public async Task<List<Video>> GetVideosByCategoryIdAsync(int categoryId)
        {
            if (!await _context.Categories.AnyAsync(c => c.Id == categoryId))
                throw new ArgumentException("Category not found");

            return await _context.Videos
                .Where(v => v.Categories.Any(c => c.Id == categoryId))
                .ToListAsync();
        }

        public async Task<List<Video>> GetVideosByTagIdAsync(int tagId)
        {
            if (!await _context.Tags.AnyAsync(t => t.Id == tagId))
                throw new ArgumentException("Tag not found");

            return await _context.Videos
                .Where(v => v.Tags.Any(t => t.Id == tagId))
                .ToListAsync();
        }

        public async Task<List<Video>> GetVideosBySeriesIdAsync(int seriesId)
        {
            if (!await _context.Series.AnyAsync(s => s.Id == seriesId))
                throw new ArgumentException("Series not found");

            return await _context.Videos
                .Where(v => v.Series.Any(s => s.Id == seriesId))
                .ToListAsync();
        }

        public async Task<List<Video>> GetVideosByUserIdAsync(int userId)
        {
            if (!await _context.Users.AnyAsync(u => u.Id == userId))
                throw new ArgumentException("User not found");

            return await _context.VideoPurchases
                .Where(vp => vp.UserId == userId)
                .Select(vp => vp.Video)
                .ToListAsync();
        }

        public async Task<Video> GetVideoByVideoPurchaseIdAsync(int videoPurchaseId)
        {
            return await _context.VideoPurchases
                .Where(vp => vp.Id == videoPurchaseId)
                .Select(vp => vp.Video)
                .FirstOrDefaultAsync() 
                ?? throw new ArgumentException("Video purchase not found");
        }

        public async Task<Video> GetVideoByCommentIdAsync(int commentId)
        {
            return await _context.Comments
                .Where(c => c.Id == commentId)
                .Select(c => c.Video)
                .FirstOrDefaultAsync() 
                ?? throw new ArgumentException("Comment not found");
        }

        public async Task<Video> GetVideoByLikeIdAsync(int likeId)
        {
            return await _context.Likes
                .Where(l => l.Id == likeId)
                .Select(l => l.Video)
                .FirstOrDefaultAsync() 
                ?? throw new ArgumentException("Like not found");
        }

        public async Task<Video> GetVideoByIdAsync(int videoId)
        {
            var video = await _context.Videos.FindAsync(videoId)
                ?? throw new ArgumentException("Video not found");
            return video ;
        }

        public async Task AddVideoAsync(Video video)
        {
            if (video == null)
            {
                throw new ArgumentNullException(nameof(video), "Video cannot be null");
            }
            await _context.Videos.AddAsync(video);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateVideoAsync(Video video)
        {
            if (video == null)
            {
                throw new ArgumentNullException(nameof(video), "Video cannot be null");
            }
            if (!await IsVideoExistAsync(video.Id))
            {
                throw new ArgumentException("Video not found");
            }

            _context.Videos.Update(video);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteVideoAsync(int videoId)
        {
            var video = await _context.Videos.FindAsync(videoId) 
                ?? throw new ArgumentException("Video not found");
            _context.Videos.Remove(video);
            await _context.SaveChangesAsync();
        }

        public async Task AddVideoToSeriesAsync(int videoId, int seriesId)
        {
            var video = await _context.Videos.Include(v => v.Series).FirstOrDefaultAsync(v => v.Id == videoId);
            var series = await _context.Series.FindAsync(seriesId);

            if (video == null)
            {
                throw new ArgumentException("Video not found");
            }

            if (series == null)
            {
                throw new ArgumentException("Series not found");
            }

            if (video.Series.Contains(series))
            {
                throw new InvalidOperationException("The video is already part of the series");
            }

            video.Series.Add(series);
            await _context.SaveChangesAsync();
        }

        public async Task AddVideoToCategoryAsync(int videoId, int categoryId)
        {
            var video = await _context.Videos.Include(v => v.Categories).FirstOrDefaultAsync(v => v.Id == videoId);
            var category = await _context.Categories.FindAsync(categoryId);

            if (video == null)
            {
                throw new ArgumentException("Video not found");
            }

            if (category == null)
            {
                throw new ArgumentException("Category not found");
            }

            if (video.Categories.Contains(category))
            {
                throw new InvalidOperationException("The video is already part of the category");
            }

            video.Categories.Add(category);
            await _context.SaveChangesAsync();
        }

        public async Task AddVideoToTagAsync(int videoId, int tagId)
        {
            var video = await _context.Videos.Include(v => v.Tags).FirstOrDefaultAsync(v => v.Id == videoId);
            var tag = await _context.Tags.FindAsync(tagId);

            if (video == null)
            {
                throw new ArgumentException("Video not found");
            }

            if (tag == null)
            {
                throw new ArgumentException("Tag not found");
            }

            if (video.Tags.Contains(tag))
            {
                throw new InvalidOperationException("The video is already part of the tag");
            }

            video.Tags.Add(tag);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveVideoFromSeriesAsync(int videoId, int seriesId)
        {
            var video = await _context.Videos.Include(v => v.Series).FirstOrDefaultAsync(v => v.Id == videoId);
            var series = await _context.Series.FindAsync(seriesId);

            if (video == null)
            {
                throw new ArgumentException("Video not found");
            }

            if (series == null)
            {
                throw new ArgumentException("Series not found");
            }

            if (!video.Series.Contains(series))
            {
                throw new InvalidOperationException("The video is not part of the series");
            }

            video.Series.Remove(series);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveVideoFromCategoryAsync(int videoId, int categoryId)
        {
            var video = await _context.Videos.Include(v => v.Categories).FirstOrDefaultAsync(v => v.Id == videoId)
                ?? throw new ArgumentException("Video not found");

            var category = await _context.Categories.FindAsync(categoryId)
                ?? throw new ArgumentException("Category not found");

           

            if (!video.Categories.Contains(category))
            {
                throw new InvalidOperationException("The video is not part of the category");
            }

            video.Categories.Remove(category);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveVideoFromTagAsync(int videoId, int tagId)
        {
            var video = await _context.Videos.Include(v => v.Tags).FirstOrDefaultAsync(v => v.Id == videoId)
                ?? throw new ArgumentException("Video not found");

            var tag = await _context.Tags.FindAsync(tagId)
                ?? throw new ArgumentException("Tag not found");


            if (!video.Tags.Contains(tag))
            {
                throw new InvalidOperationException("The video is not part of the tag");
            }

            video.Tags.Remove(tag);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> IsVideoExistAsync(int videoId)
        {
            return await _context.Videos.AnyAsync(v => v.Id == videoId);
        }

        public async Task<bool> IsVideoExistInTagAsync(int tagId, int videoId)
        {
            var tag = await _context.Tags
                                    .Include(t => t.Videos)
                                    .FirstOrDefaultAsync(t => t.Id == tagId)
            ?? throw new ArgumentException("Tag not found");

      
            if (!tag.Videos.Any(v => v.Id == videoId))
            {
                throw new InvalidOperationException("Video not found in this tag");
            }

            return true;
        }

        public async Task<bool> IsVideoExistInSeriesAsync(int seriesId, int videoId)
        {
            var series = await _context.Series
                                       .Include(s => s.Videos)
                                       .FirstOrDefaultAsync(s => s.Id == seriesId)
            ?? throw new ArgumentException("Series not found");


            if (!series.Videos.Any(v => v.Id == videoId))
            {
                throw new InvalidOperationException("Video not found in this series");
            }

            return true;
        }

        public async Task<bool> IsVideoExistInCategoryAsync(int categoryId, int videoId)
        {
            var category = await _context.Categories
                                        .Include(c => c.Videos)
                                        .FirstOrDefaultAsync(c => c.Id == categoryId)
            ?? throw new ArgumentException("Category not found");


            if (!category.Videos.Any(v => v.Id == videoId))
            {
                throw new InvalidOperationException("Video not found in this category");
            }

            return true;
        }

        public async Task<List<Video>> GetVideosByExcludedSeriesIdAsync(int excludedSeriesId)
        {
            if (!await _context.Series.AnyAsync(s => s.Id == excludedSeriesId))
            {
                throw new ArgumentException("Series not found");
            }
            return await _context.Videos.Include(v => v.Series).Where(v => !v.Series.Any(s => s.Id == excludedSeriesId)).ToListAsync();
        }

        public async Task<List<Video>> GetVideosByExcludedCategoryIdAsync(int excludedCategoryId)
        {
            if (!await _context.Categories.AnyAsync(c => c.Id == excludedCategoryId))
            {
                throw new ArgumentException("Category not found");
            }
            return await _context.Videos.Include(v => v.Categories).Where(v => !v.Categories.Any(c => c.Id == excludedCategoryId)).ToListAsync();
        }

        public async Task<List<Video>> GetVideosByExcludedTagIdAsync(int excludedTagId)
        {
            if (!await _context.Tags.AnyAsync(t => t.Id == excludedTagId))
            {
                throw new ArgumentException("Tag not found");
            }
            return await _context.Videos.Include(v => v.Tags).Where(v => !v.Tags.Any(t => t.Id == excludedTagId)).ToListAsync();
        }

        public async Task<List<Video>> GetVideosByExcludedUserIdAsync(int userId)
        {
            if (!await _context.Users.AnyAsync(u => u.Id == userId))
            {
                throw new ArgumentException("User not found");
            }

            var purchasedVideoIds = await _context.VideoPurchases
                .Where(vp => vp.UserId == userId)
                .Select(vp => vp.VideoId)
                .ToListAsync();

            return await _context.Videos
                .Where(v => !purchasedVideoIds.Contains(v.Id))
                .ToListAsync();
        }



    }
}