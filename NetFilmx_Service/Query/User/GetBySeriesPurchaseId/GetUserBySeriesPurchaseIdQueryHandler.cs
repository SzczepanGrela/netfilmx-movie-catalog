using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.User;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.User
{
    public sealed class GetUserBySeriesPurchaseIdQueryHandler<TDto> : IRequestHandler<GetUserBySeriesPurchaseIdQuery<TDto>, QResult<TDto>>
        where TDto : IUserDto
    {
        private readonly IUserRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetUserBySeriesPurchaseIdQueryHandler(IUserRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<TDto>> Handle(GetUserBySeriesPurchaseIdQuery<TDto> query, CancellationToken cancellationToken)
        {
            var user = await _repository.GetUserBySeriesPurchaseIdAsync(query.SeriesPurchaseId);
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
