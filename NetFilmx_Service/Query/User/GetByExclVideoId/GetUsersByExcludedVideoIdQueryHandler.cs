using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.User;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.User
{
    public sealed class GetUsersByExcludedVideoIdQueryHandler<TDto> : IRequestHandler<GetUsersByExcludedVideoIdQuery<TDto>, QResult<List<TDto>>>
    where TDto : IUserDto
    {
        private readonly IUserRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetUsersByExcludedVideoIdQueryHandler(IUserRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<List<TDto>>> Handle(GetUsersByExcludedVideoIdQuery<TDto> query, CancellationToken cancellationToken)
        {
            var users = await _repository.GetUsersByExcludedVideoIdAsync(query.VideoId);
            if (users == null)
            {
                return QResult<List<TDto>>.Fail("Users not found");
            }

            List<TDto> userDtos;
            try
            {
                userDtos = _mapper.MapList<TDto>(users);
                return QResult<List<TDto>>.Ok(userDtos);
            }
            catch (Exception ex)
            {
                return QResult<List<TDto>>.Fail(ex.Message);
            }
        }
    }
}
