using MediatR;
using NetFilmx_Service.Result;

namespace NetFilmx_Service.Command.Video
{
    public sealed class AddVideoCommand : IRequest<QResult<int>>
    {

        public AddVideoCommand(string title, string? description, decimal price, string videoUrl, string? thumbnailUrl, string? sourceUploadId = null)
        {
            Title = title;
            Description = description;
            Price = price;
            VideoUrl = videoUrl;
            ThumbnailUrl = thumbnailUrl;
            SourceUploadId = sourceUploadId;
        }

        public string? SourceUploadId { get; }

        public string Title { get; }

        public string? Description { get; }

        public decimal Price { get; }

        public string VideoUrl { get; }

        public string? ThumbnailUrl { get; }



    }
}
