using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.VideoPurchase;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.VideoPurchase
{
    public sealed class GetVideoPurchasesByUserIdQueryHandler<TDto> : IRequestHandler<GetVideoPurchasesByUserIdQuery<TDto>, QResult<List<TDto>>>
        where TDto : IVideoPurchaseDto
    {
        private readonly IVideoPurchaseRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetVideoPurchasesByUserIdQueryHandler(IVideoPurchaseRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<List<TDto>>> Handle(GetVideoPurchasesByUserIdQuery<TDto> query, CancellationToken cancellationToken)
        {

            List<TDto> videoPurchasesDto;
            try
            {
                var videoPurchases = await _repository.GetVideoPurchasesByUserIdAsync(query.UserId);

                videoPurchasesDto = _mapper.MapList<TDto>(videoPurchases);
                return QResult<List<TDto>>.Ok(videoPurchasesDto);
            }
            catch (Exception ex)
            {
                return QResult<List<TDto>>.Fail(ex.Message);
            }

        }
    }
}
