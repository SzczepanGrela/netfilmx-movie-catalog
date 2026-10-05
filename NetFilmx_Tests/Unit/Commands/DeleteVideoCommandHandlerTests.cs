using FluentAssertions;
using Moq;
using NetFilmx_Service.Command.Video;
using NetFilmx_Service.Search;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Tests.Unit.Commands;

public class DeleteVideoCommandHandlerTests
{
    [Fact]
    public async Task Deletion_RemovesMetadataAndSearchEntry_WithoutLoadingOrInterpretingMediaUrls()
    {
        var repository = new Mock<IVideoRepository>(MockBehavior.Strict);
        var search = new Mock<ISearchEngine>(MockBehavior.Strict);
        var sequence = new MockSequence();
        repository.InSequence(sequence).Setup(r => r.DeleteVideoAsync(1)).Returns(Task.CompletedTask);
        search.InSequence(sequence).Setup(s => s.RemoveVideo(1));
        var handler = new DeleteVideoCommandHandler(repository.Object, search.Object);

        var result = await handler.Handle(new DeleteVideoCommand(1), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        repository.VerifyAll();
        search.VerifyAll();
        repository.VerifyNoOtherCalls();
        search.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task FailedDatabaseDeletion_KeepsTheSearchEntry()
    {
        var repository = new Mock<IVideoRepository>(MockBehavior.Strict);
        var search = new Mock<ISearchEngine>(MockBehavior.Strict);
        repository.Setup(r => r.DeleteVideoAsync(1)).ThrowsAsync(new InvalidOperationException("Cannot delete"));
        var handler = new DeleteVideoCommandHandler(repository.Object, search.Object);

        var result = await handler.Handle(new DeleteVideoCommand(1), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        search.VerifyNoOtherCalls();
    }
}
