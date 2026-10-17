using NetFilmx_Storage.Entities;

namespace NetFilmx_Storage.Repositories
{
    public interface ICategoryRepository
    {
        Task<List<Category>> GetAllCategoriesAsync();
        Task<(IEnumerable<Category>, int totalCount)> GetPagedCategoriesAsync(int pageNumber, int pageSize, string searchTerm);
        Task<List<Category>> GetCategoriesByVideoIdAsync(int videoId);
        Task<List<Category>> GetCategoriesByExcludedVideoIdAsync(int videoId);

        Task<Category> GetCategoryByIdAsync(int categoryId);
        Task<Category> GetCategoryByNameAsync(string categoryName);

        Task AddCategoryAsync(Category category);
        Task UpdateCategoryAsync(Category category);
        Task DeleteCategoryAsync(int categoryId);

        Task<bool> IsCategoryExistAsync(string categoryName);
        Task<bool> IsCategoryExistAsync(int categoryId);

        Task<int> GetVideoCountByCategoryIdAsync(int categoryId);
        Task<int> GetVideoCountByCategoryNameAsync(string categoryName);
    }
}
