using MediatR;
using NetFilmx_Service.Result;
using EntityUser = NetFilmx_Storage.Entities.User;

namespace NetFilmx_Service.Command.Auth
{
    public record LoginCommand(string Username, string Password, bool RememberMe) : IRequest<QResult<EntityUser>>;
}
