using FluentValidation;

namespace NetFilmx_Service.Command.Video
{
    public sealed class AddVideoCommandValidator : AbstractValidator<AddVideoCommand>
    {
        public static int titleMaxLength { get; } = 100;

        public static int maxDescriptionLength { get; } = 2000;

        public AddVideoCommandValidator()
        {
            RuleFor(x => x.Title).NotEmpty().WithMessage("Title cannot be empty").MaximumLength(titleMaxLength).WithMessage($"Title can not be more than {titleMaxLength} characters");
            RuleFor(x => x.Description).NotEmpty().WithMessage("Description cannot be empty").MaximumLength(maxDescriptionLength).WithMessage($"Description can not be more than {maxDescriptionLength} characters");
            RuleFor(x => x.Price).NotEmpty().WithMessage("Price cannot be empty").GreaterThanOrEqualTo(0).WithMessage("Price cannot be lower than 0");
            RuleFor(x => x.VideoUrl).NotEmpty().WithMessage("Url cannot be empty").MinimumLength(3).WithMessage("Url must be at least 3 chaacters");
            RuleFor(x => x.ThumbnailUrl).NotEmpty().WithMessage("Thumbnail cannot be empty").MinimumLength(3).WithMessage("Thumbnail must be at least 3 chaacters");

        }



    }
}
