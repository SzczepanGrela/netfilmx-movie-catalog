using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.Series
{
    public sealed class GetSeriesByVideoIdQueryHandler<TDto> : IRequestHandler<GetSeriesByVideoIdQuery<TDto>, QResult<List<TDto>>>
    {
        private readonly ISeriesRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetSeriesByVideoIdQueryHandler(ISeriesRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<List<TDto>>> Handle(GetSeriesByVideoIdQuery<TDto> query, CancellationToken cancellationToken)
        {

            List<TDto> seriesDto;
            try
            {
                var series = await _repository.GetSeriesByVideoIdAsync(query.VideoId);
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
