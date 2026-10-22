using MediatR;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Command.Comment
{
    public sealed class EditCommentCommandHandler : IRequestHandler<EditCommentCommand, CResult>
    {
        private readonly ICommentRepository _repository;

        public EditCommentCommandHandler(ICommentRepository repository)
        {
            _repository = repository;
        }


        public async Task<CResult> Handle(EditCommentCommand command, CancellationToken cancellationToken)
        {
            if (command == null)
            {
                return CResult.Fail("Command is null");
            }
            var commandValidation = new EditCommentCommandValidator().Validate(command);

            if (!commandValidation.IsValid)
            {
                return CResult.Fail(commandValidation);
            }

            try
            {
                var comment = await _repository.GetCommentByIdAsync(command.Id);

                //var comment = task.Result;

                comment.Content = command.Content;
                comment.UpdatedAt = DateTime.UtcNow;

                await _repository.UpdateCommentAsync(comment);
                return CResult.Ok();
            }
            catch (Exception ex)
            {
                return CResult.Fail(ex.Message);
            }
        }
    }
}
