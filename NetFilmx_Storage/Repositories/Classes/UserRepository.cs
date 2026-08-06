using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;

namespace NetFilmx_Storage.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly NetFilmxDbContext _context;

        public UserRepository(NetFilmxDbContext context)
        {
            _context = context;
        }

        public async Task<List<User>> GetAllUsersAsync()
        {
            return await _context.Users.ToListAsync();
        }

        public async Task<List<User>> GetUsersByVideoIdAsync(int videoId)
        {
            return await _context.Users.Include(u => u.VideoPurchases).Where(u => u.VideoPurchases.Any(vp => vp.VideoId == videoId)).ToListAsync();
        }

        public async Task<List<User>> GetUsersBySeriesIdAsync(int seriesId)
        {
            return await _context.Users.Include(u => u.SeriesPurchases).Where(u => u.SeriesPurchases.Any(sp => sp.SeriesId == seriesId)).ToListAsync();
        }

        public async Task<List<User>> GetUsersByExcludedSeriesIdAsync(int excludedSeriesId)
        {
            if (!await _context.Series.AnyAsync(s => s.Id == excludedSeriesId))
            {
                throw new ArgumentException("Series not found");
            }

            return await _context.Users
                .Include(u => u.SeriesPurchases)
                .Where(u => !u.SeriesPurchases.Any(sp => sp.SeriesId == excludedSeriesId))
                .ToListAsync();
        }



        public async Task<List<User>> GetUsersByExcludedVideoIdAsync(int videoId)
        {
            if (!await _context.Videos.AnyAsync(v => v.Id == videoId))
            {
                throw new ArgumentException("Video not found");
            }

            var userIdsWithVideo = await _context.VideoPurchases
                .Where(vp => vp.VideoId == videoId)
                .Select(vp => vp.UserId)
                .ToListAsync();

            return await _context.Users
                .Where(u => !userIdsWithVideo.Contains(u.Id))
                .ToListAsync();
        }



        public async Task<User> GetUserByIdAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId)
                ?? throw new ArgumentException("User not found");
            return user ;
        }

        public async Task<User> GetUserByUsernameAsync(string username)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username)
                ?? throw new ArgumentException("User not found");
            return user ;
        }

        public async Task<User> GetUserByCommentIdAsync(int commentId)
        {
            var comment = await _context.Comments.FindAsync(commentId) 
                ?? throw new ArgumentException("Comment not found");
            return await GetUserByIdAsync(comment.UserId);
        }

        public async Task<User> GetUserByLikeIdAsync(int likeId)
        {
            var like = await _context.Likes.FindAsync(likeId) 
                ?? throw new ArgumentException("Like not found");
            return await GetUserByIdAsync(like.UserId);
        }

        public async Task<User> GetUserByVideoPurchaseIdAsync(int videoPurchaseId)
        {
            var videoPurchase = await _context.VideoPurchases.FindAsync(videoPurchaseId)
                ?? throw new ArgumentException("Video purchase not found");
            return await GetUserByIdAsync(videoPurchase.UserId);
        }

        public async Task<User> GetUserBySeriesPurchaseIdAsync(int seriesPurchaseId)
        {
            var seriesPurchase = await _context.SeriesPurchases.FindAsync(seriesPurchaseId)
                ?? throw new ArgumentException("Series purchase not found");
            return await GetUserByIdAsync(seriesPurchase.UserId);
        }

        public async Task AddUserAsync(User user)
        {
            if (user == null)
            {
                throw new ArgumentNullException(nameof(user), "User cannot be null");
            }
            if (!await IsUsernameAvailableAsync(user.Username))
            {
                throw new InvalidOperationException("A user with this username already exists");
            }
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateUserAsync(User user)
        {
            if (user == null)
            {
                throw new ArgumentNullException(nameof(user), "User cannot be null");
            }
            if (!await IsUserExistAsync(user.Id))
            {
                throw new ArgumentException("User not found");
            }
            _context.Users.Attach(user);
            _context.Entry(user).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteUserAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                throw new ArgumentException("User not found");
            }
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> IsUsernameAvailableAsync(string username)
        {
            return !await _context.Users.AnyAsync(u => u.Username == username);
        }

        public async Task<bool> IsUserExistAsync(int userId)
        {
            return await _context.Users.AnyAsync(u => u.Id == userId);
        }


        public async Task<bool> IsUsernameAvailableForUserAsync(string username, int userId)
        {
            return !await _context.Users.AnyAsync(u => u.Username == username && u.Id != userId);
        }


    }
}
