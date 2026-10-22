using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;

namespace NetFilmx_Storage.Repositories
{
    public class TagRepository : ITagRepository
    {
        private readonly NetFilmxDbContext _context;

        public TagRepository(NetFilmxDbContext context)
        {
            _context = context;
        }

        public async Task<List<Tag>> GetAllTagsAsync()
        {
            var tags = await _context.Tags.ToListAsync();
            return tags;
        }

        public async Task<(IEnumerable<Tag>, int totalCount)> GetPagedTagsAsync(int pageNumber, int pageSize, string searchTerm)
        {
            var query = _context.Tags.AsQueryable();

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                query = query.Where(t => t.Name.ToLower().Contains(searchTerm.ToLower()));
            }

            var totalCount = await query.CountAsync();
            var tags = await query
                .OrderBy(t => t.Name)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (tags, totalCount);
        }

        public async Task<List<Tag>> GetTagsByVideoIdAsync(int videoId)
        {
            var video = await _context.Videos.FindAsync(videoId);
            if (video == null)
            {
                throw new ArgumentException("Video not found");
            }

            return await _context.Tags.Include(t => t.Videos).Where(t => t.Videos.Any(v => v.Id == videoId)).ToListAsync();
        }

        public async Task<Tag> GetTagByIdAsync(int tagId)
        {
            var tag = await _context.Tags.FindAsync(tagId)
                ?? throw new ArgumentException("Tag not found");
            return tag ;
        }

        public async Task<Tag> GetTagByNameAsync(string tagName)
        {
            var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Name == tagName)
                ?? throw new ArgumentException("Tag not found");
            return tag; 
        }

        public async Task AddTagAsync(Tag tag)
        {
            if (tag == null)
            {
                throw new ArgumentNullException(nameof(tag), "Tag cannot be null");
            }
            if (await IsTagExistAsync(tag.Name))
            {
                throw new InvalidOperationException("A tag with this name already exists");
            }
            await _context.Tags.AddAsync(tag);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateTagAsync(Tag tag)
        {
            if (tag == null)
            {
                throw new ArgumentNullException(nameof(tag), "Tag cannot be null");
            }
            if (!await IsTagExistAsync(tag.Id))
            {
                throw new ArgumentException("Tag not found");
            }
            _context.Tags.Attach(tag);
            _context.Entry(tag).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task<List<Tag>> GetTagsByExcludedVideoIdAsync(int videoId)
        {
            var video = await _context.Videos.Include(v => v.Tags).FirstOrDefaultAsync(v => v.Id == videoId) 
                ?? throw new ArgumentException("Video not found");
            var allTags = await _context.Tags.ToListAsync();
            var excludedTags = allTags.Where(t => !video.Tags.Any(vt => vt.Id == t.Id)).ToList();

            return excludedTags;
        }



        public async Task DeleteTagAsync(int tagId)
        {
            var tag = await _context.Tags.FindAsync(tagId);
            if (tag == null)
            {
                throw new ArgumentException("Tag not found");
            }
            _context.Tags.Remove(tag);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> IsTagExistAsync(string tagName)
        {
            return await _context.Tags.AnyAsync(c => c.Name == tagName);
        }

        public async Task<bool> IsTagExistAsync(int tagId)
        {
            return await _context.Tags.AnyAsync(c => c.Id == tagId);
        }

        public async Task<int> GetVideosCountByTagIdAsync(int tagId)
        {
            return await _context.Tags.Include(t => t.Videos).Where(t => t.Id == tagId).SelectMany(t => t.Videos).CountAsync();
        }

        public async Task<int> GetVideosCountByTagNameAsync(string tagName)
        {
            return await _context.Tags.Include(t => t.Videos).Where(t => t.Name == tagName).SelectMany(t => t.Videos).CountAsync();
        }


    }
}
