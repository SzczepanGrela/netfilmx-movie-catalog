using MediatR;
using NetFilmx_Service.Result;

namespace NetFilmx_Service.Command.Auth
{
    public record RegisterCommand(string Username, string Email, string Password) : IRequest<CResult>;
}
