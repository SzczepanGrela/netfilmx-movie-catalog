using MediatR;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Command.User
{
    public sealed class NewPasswordCommandHandler : IRequestHandler<NewPasswordCommand, CResult>
    {
        private readonly IUserRepository _repository;
        private readonly NetFilmx_Service.Security.IPasswordHasher _passwordHasher;

        public NewPasswordCommandHandler(IUserRepository repository, NetFilmx_Service.Security.IPasswordHasher passwordHasher)
        {
            _repository = repository;
            _passwordHasher = passwordHasher;
        }

        public async Task<CResult> Handle(NewPasswordCommand command, CancellationToken cancellationToken)
        {

            if (command == null)
            {
                return CResult.Fail("Command is null");
            }

            var validation = new NewPasswordCommandValidator().Validate(command);
            if (!validation.IsValid)
            {
                return CResult.Fail(validation.Errors.ToString());
            }
            try
            {
                var user = await _repository.GetUserByIdAsync(command.Id);

                //var user = task.Result;

                user.PasswordHash = _passwordHasher.HashPassword(command.Password);
                user.UpdatedAt = DateTime.Now;

                await _repository.UpdateUserAsync(user);

                return CResult.Ok();
            }
            catch (Exception ex)
            {
                return CResult.Fail(ex.Message);
            }


        }

    }
}
