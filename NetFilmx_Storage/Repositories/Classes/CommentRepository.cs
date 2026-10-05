using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;

namespace NetFilmx_Storage.Repositories
{
    public class CommentRepository : ICommentRepository
    {
        private readonly NetFilmxDbContext _context;

        public CommentRepository(NetFilmxDbContext context)
        {
            _context = context;
        }

        public async Task<List<Comment>> GetAllCommentsAsync()
        {
            var comments = await _context.Comments.ToListAsync();
            return comments;
        }

        public async Task<(IEnumerable<Comment>, int totalCount)> GetPagedCommentsAsync(int pageNumber, int pageSize, string searchTerm)
        {
            var query = _context.Comments
                .Include(c => c.User)
                .Include(c => c.Video)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                query = query.Where(c => c.Content.ToLower().Contains(searchTerm.ToLower()) || 
                                         c.User.Username.ToLower().Contains(searchTerm.ToLower()) ||
                                         c.Video.Title.ToLower().Contains(searchTerm.ToLower()));
            }

            var totalCount = await query.CountAsync();
            var comments = await query
                .OrderByDescending(c => c.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (comments, totalCount);
        }

        public async Task<List<Comment>> GetCommentsByVideoIdAsync(int videoId)
        {
            if (!await _context.Videos.AnyAsync(v => v.Id == videoId))
            {
                throw new ArgumentException("Video not found");
            }
            return await _context.Comments.Where(c => c.VideoId == videoId).ToListAsync();
        }

        public async Task<List<Comment>> GetCommentsByUserIdAsync(int userId)
        {
            if (!await _context.Users.AnyAsync(u => u.Id == userId))
            {
                throw new ArgumentException("User not found");
            }
            return await _context.Comments.Where(c => c.UserId == userId).ToListAsync();
        }

        public async Task<Comment> GetCommentByIdAsync(int id)
        {
            var comment = await _context.Comments.FindAsync(id);
            return comment ?? throw new ArgumentException("Comment not found");
        }

        public async Task AddCommentAsync(Comment comment)
        {
            if (comment == null)
            {
                throw new ArgumentNullException(nameof(comment), "Comment cannot be null");
            }
            await _context.Comments.AddAsync(comment);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateCommentAsync(Comment comment)
        {
            if (comment == null)
            {
                throw new ArgumentNullException(nameof(comment), "Comment cannot be null");
            }
            if (!await IsCommentExistAsync(comment.Id))
            {
                throw new ArgumentException("Comment not found");
            }
            _context.Comments.Attach(comment);
            _context.Entry(comment).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteCommentAsync(int id)
        {
            var comment = await GetCommentByIdAsync(id) ?? throw new ArgumentException("Comment not found");

            _context.Comments.Remove(comment);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> IsCommentExistAsync(int commentId)
        {
            return await _context.Comments.AnyAsync(c => c.Id == commentId);
        }
    }
}
