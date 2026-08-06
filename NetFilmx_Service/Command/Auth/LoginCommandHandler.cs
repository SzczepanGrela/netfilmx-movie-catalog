using MediatR;
using NetFilmx_Service.Result;
using EntityUser = NetFilmx_Storage.Entities.User;
using NetFilmx_Storage.Repositories;
using NetFilmx_Service.Security;

namespace NetFilmx_Service.Command.Auth
{
    public class LoginCommandHandler : IRequestHandler<LoginCommand, QResult<EntityUser>>
    {
        private readonly IUserRepository _userRepository;
        private readonly IPasswordHasher _passwordHasher;

        public LoginCommandHandler(IUserRepository userRepository, IPasswordHasher passwordHasher)
        {
            _userRepository = userRepository;
            _passwordHasher = passwordHasher;
        }

        public async Task<QResult<EntityUser>> Handle(LoginCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var user = await _userRepository.GetUserByUsernameAsync(request.Username);

                if (!_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
                {
                    return QResult<EntityUser>.Fail("Invalid credentials");
                }

                if (_passwordHasher.NeedsRehash(user.PasswordHash))
                {
                    user.PasswordHash = _passwordHasher.HashPassword(request.Password);
                    await _userRepository.UpdateUserAsync(user);
                }

                return QResult<EntityUser>.Ok(user);
            }
            catch (ArgumentException)
            {
                return QResult<EntityUser>.Fail("Invalid credentials");
            }
        }
    }
}
