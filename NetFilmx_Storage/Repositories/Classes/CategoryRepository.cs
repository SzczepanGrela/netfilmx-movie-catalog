using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;
using NetFilmx_Storage.Entities;
using System.Data;

namespace NetFilmx_Storage.Repositories
{
    public class CategoryRepository : ICategoryRepository
    {
        private readonly NetFilmxDbContext _context;


        public CategoryRepository(NetFilmxDbContext context)
        {
            _context = context;

        }

        public async Task<List<Category>> GetAllCategoriesAsync()
        {
            var categories = await _context.Categories.ToListAsync();
            return categories;
        }

        public async Task<(IEnumerable<Category>, int totalCount)> GetPagedCategoriesAsync(int pageNumber, int pageSize, string searchTerm)
        {
            var query = _context.Categories.AsQueryable();

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                query = query.Where(c => c.Name.ToLower().Contains(searchTerm.ToLower()) || c.Description.ToLower().Contains(searchTerm.ToLower()));
            }

            var totalCount = await query.CountAsync();
            var categories = await query
                .OrderBy(c => c.Name)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (categories, totalCount);
        }

        public async Task<List<Category>> GetCategoriesByVideoIdAsync(int videoId)
        {

           var video = await _context.Videos.Include(v => v.Categories).FirstOrDefaultAsync(v => v.Id == videoId) 
                ?? throw new ArgumentException("Video not found");

           return video.Categories.ToList();
        }


        public async Task<List<Category>> GetCategoriesByExcludedVideoIdAsync(int videoId)
        {
            var video = await _context.Videos.FindAsync(videoId) 
                ?? throw new ArgumentException("Video not found");


            var categories = await _context.Categories.Include(c => c.Videos).
                Where(c => !c.Videos.Any(v => v.Id == videoId)).ToListAsync();

        
            return categories;
        }



        public async Task<Category> GetCategoryByNameAsync(string categoryName)
        {
            var category = await _context.Categories.FirstOrDefaultAsync(c => c.Name == categoryName);
            return category ?? throw new ArgumentException("Category not found");
        }

        public async Task<Category> GetCategoryByIdAsync(int categoryId)
        {
            var category = await _context.Categories.FindAsync(categoryId);
            return category ?? throw new ArgumentException("Category not found");
        }

        public async Task AddCategoryAsync(Category category)
        {
            if (category == null)
            {
                throw new ArgumentNullException(nameof(category), "Category cannot be null");
            }
            if (await IsCategoryExistAsync(category.Name))
            {
                throw new InvalidOperationException("A category with this name already exists");
            }
            await _context.Categories.AddAsync(category);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateCategoryAsync(Category category)
        {
            if (category == null)
            {
                throw new ArgumentNullException(nameof(category), "Category cannot be null");
            }
            if (!await IsCategoryExistAsync(category.Id))
            {
                throw new DataException("Category not found");
            }
            _context.Categories.Attach(category);
            _context.Entry(category).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteCategoryAsync(int categoryId)
        {
            var category = await _context.Categories.FindAsync(categoryId);
            if (category == null)
            {
                throw new DataException("Category not found");
            }
            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> IsCategoryExistAsync(string categoryName)
        {
            return await _context.Categories.AnyAsync(c => c.Name == categoryName);
        }

        public async Task<bool> IsCategoryExistAsync(int categoryId)
        {
            return await _context.Categories.AnyAsync(c => c.Id == categoryId);
        }

        public async Task<int> GetVideoCountByCategoryIdAsync(int categoryId)
        {
            return await _context.Categories.Include(c => c.Videos).Where(c => c.Id == categoryId).SelectMany(c => c.Videos).CountAsync();
        }

        public async Task<int> GetVideoCountByCategoryNameAsync(string categoryName)
        {
            return await _context.Categories.Include(c => c.Videos).Where(c => c.Name == categoryName).SelectMany(c => c.Videos).CountAsync();
        }


    }
}
