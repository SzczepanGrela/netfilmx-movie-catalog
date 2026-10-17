using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.User;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.User
{
    public class GetUsersByExcludedSeriesIdQueryHandler<TDto> : IRequestHandler<GetUsersByExcludedSeriesIdQuery<TDto>, QResult<List<TDto>>>
    where TDto : IUserDto

    {
        private readonly IUserRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetUsersByExcludedSeriesIdQueryHandler(IUserRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }


        public async Task<QResult<List<TDto>>> Handle(GetUsersByExcludedSeriesIdQuery<TDto> query, CancellationToken cancellationToken)
        {

            List<TDto> usersDto;
            try
            {
                var users = await _repository.GetUsersByExcludedSeriesIdAsync(query.SeriesId);
                usersDto = _mapper.MapList<TDto>(users);
                return QResult<List<TDto>>.Ok(usersDto);
            }
            catch (Exception ex)
            {
                return QResult<List<TDto>>.Fail(ex.Message);
            }

        }

    }
}
