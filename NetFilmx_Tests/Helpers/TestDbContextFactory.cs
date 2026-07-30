using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;

namespace NetFilmx_Tests.Helpers
{
    public static class TestDbContextFactory
    {
        public static NetFilmxDbContext Create(string? dbName = null)
        {
            var options = new DbContextOptionsBuilder<NetFilmxDbContext>()
                .UseInMemoryDatabase(databaseName: dbName ?? Guid.NewGuid().ToString())
                .Options;

            var context = new NetFilmxDbContext(options);
            context.Database.EnsureCreated();
            return context;
        }
    }
}
