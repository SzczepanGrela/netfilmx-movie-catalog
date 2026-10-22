using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Entities;
using NetFilmx_Storage.Repositories;
using NetFilmx_Tests.Helpers;
using Xunit;

namespace NetFilmx_Tests.Unit.Repositories
{
    public class VideoRepositoryTests
    {
        [Fact]
        public async Task DeleteVideoAsync_ShouldRemoveVideoAndCascadeDeleteRelatedEntities()
        {
            // Arrange
            using var context = TestDbContextFactory.Create();
            var repository = new VideoRepository(context);

            var user = new User("testuser", "test@netfilmx.dev", "hashedpassword");
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var video = new Video("Big Buck Bunny", "Description", 15m, "https://cdn/hls.m3u8", "https://cdn/thumb.jpg");
            var category = new Category("Animation", "Animated movies");
            var tag = new Tag("4k");
            var series = new Series("Blender Open Movies", 50m, "All movies");

            video.Categories.Add(category);
            video.Tags.Add(tag);
            video.Series.Add(series);

            context.Videos.Add(video);
            context.Categories.Add(category);
            context.Tags.Add(tag);
            context.Series.Add(series);
            await context.SaveChangesAsync();

            var comment = new Comment(user.Id, video.Id, "Great movie!");
            var like = new Like(user.Id, video.Id);
            var purchase = new VideoPurchase(user.Id, video.Id);

            context.Comments.Add(comment);
            context.Likes.Add(like);
            context.VideoPurchases.Add(purchase);
            await context.SaveChangesAsync();

            int videoId = video.Id;

            // Act
            await repository.DeleteVideoAsync(videoId);

            // Assert
            var deletedVideo = await context.Videos.FindAsync(videoId);
            deletedVideo.Should().BeNull();

            var remainingComments = await context.Comments.Where(c => c.VideoId == videoId).ToListAsync();
            remainingComments.Should().BeEmpty();

            var remainingLikes = await context.Likes.Where(l => l.VideoId == videoId).ToListAsync();
            remainingLikes.Should().BeEmpty();

            var remainingPurchases = await context.VideoPurchases.Where(p => p.VideoId == videoId).ToListAsync();
            remainingPurchases.Should().BeEmpty();

            // Other entities should still exist
            var existingCategory = await context.Categories.FindAsync(category.Id);
            existingCategory.Should().NotBeNull();
        }

        [Fact]
        public async Task DeleteVideoAsync_WhenVideoDoesNotExist_ShouldThrowArgumentException()
        {
            // Arrange
            using var context = TestDbContextFactory.Create();
            var repository = new VideoRepository(context);

            // Act & Assert
            var act = async () => await repository.DeleteVideoAsync(99999);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*not found*");
        }
    }
}
