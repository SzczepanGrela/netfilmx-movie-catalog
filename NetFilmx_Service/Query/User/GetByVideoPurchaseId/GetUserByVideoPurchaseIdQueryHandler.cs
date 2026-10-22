using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.User;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.User
{
    public sealed class GetUserByVideoPurchaseIdQueryHandler<TDto> : IRequestHandler<GetUserByVideoPurchaseIdQuery<TDto>, QResult<TDto>>
        where TDto : IUserDto
    {
        private readonly IUserRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetUserByVideoPurchaseIdQueryHandler(IUserRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<TDto>> Handle(GetUserByVideoPurchaseIdQuery<TDto> query, CancellationToken cancellationToken)
        {
            var user = await _repository.GetUserByVideoPurchaseIdAsync(query.VideoPurchaseId);
            if (user == null)
            {
                return QResult<TDto>.Fail("User not found");
            }
            TDto userDto;
            try
            {
                userDto = _mapper.Map<TDto>(user);
                return QResult<TDto>.Ok(userDto);
            }
            catch (Exception ex)
            {
                return QResult<TDto>.Fail(ex.Message);
            }

        }
    }
}
