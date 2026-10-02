using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.Series;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.Series
{
    public sealed class GetSeriesByExcludedVideoIdQueryHandler<TDto> : IRequestHandler<GetSeriesByExcludedVideoIdQuery<TDto>, QResult<List<TDto>>>
    where TDto : ISeriesDto
    {
        private readonly ISeriesRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetSeriesByExcludedVideoIdQueryHandler(ISeriesRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<List<TDto>>> Handle(GetSeriesByExcludedVideoIdQuery<TDto> query, CancellationToken cancellationToken)
        {
            var series = await _repository.GetSeriesByExcludedVideoIdAsync(query.VideoId);
            if (series == null)
            {
                return QResult<List<TDto>>.Fail("Series not found");
            }

            List<TDto> seriesDto;
            try
            {
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
