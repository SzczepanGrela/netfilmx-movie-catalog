using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.Series;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.Series
{
    public sealed class GetSeriesByUserIdQueryHandler<TDto> : IRequestHandler<GetSeriesByUserIdQuery<TDto>, QResult<List<TDto>>>
    where TDto : ISeriesDto
    {
        private readonly ISeriesRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetSeriesByUserIdQueryHandler(ISeriesRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<List<TDto>>> Handle(GetSeriesByUserIdQuery<TDto> query, CancellationToken cancellationToken)
        {
            List<TDto> seriesDto;
            try
            {
                var series = await _repository.GetSeriesByUserIdAsync(query.UserId);
                seriesDto = _mapper.MapList<TDto>(series);
                return QResult<List<TDto>>.Ok(seriesDto);
            }
            catch (Exception ex)
            {
                return QResult<List<TDto>>.Fail(ex.Message);
            }
        }
    }
}
