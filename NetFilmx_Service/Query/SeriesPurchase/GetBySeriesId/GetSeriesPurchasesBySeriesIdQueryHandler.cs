using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.SeriesPurchase;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.SeriesPurchase
{
    public sealed class GetSeriesPurchasesBySeriesIdQueryHandler<TDto> : IRequestHandler<GetSeriesPurchasesBySeriesIdQuery<TDto>, QResult<List<TDto>>>
         where TDto : ISeriesPurchaseDto
    {
        private readonly ISeriesPurchaseRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetSeriesPurchasesBySeriesIdQueryHandler(ISeriesPurchaseRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<List<TDto>>> Handle(GetSeriesPurchasesBySeriesIdQuery<TDto> query, CancellationToken cancellationToken)
        {


            List<TDto> seriesPurchasesDto;
            try
            {
                var seriesPurchases = await _repository.GetSeriesPurchasesBySeriesIdAsync(query.SeriesId);
                seriesPurchasesDto = _mapper.MapList<TDto>(seriesPurchases);
                return QResult<List<TDto>>.Ok(seriesPurchasesDto);
            }
            catch (Exception ex)
            {
                return QResult<List<TDto>>.Fail(ex.Message);
            }

        }
    }
}
