using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.Category;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;


namespace NetFilmx_Service.Query.Category
{
    public sealed class GetCategoriesByExcludedVideoIdQueryHandler<TDto> : IRequestHandler<GetCategoriesByExcludedVideoIdQuery<TDto>, QResult<List<TDto>>>
    where TDto : ICategoryDto

    {

        private readonly ICategoryRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetCategoriesByExcludedVideoIdQueryHandler(ICategoryRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }


        public async Task<QResult<List<TDto>>> Handle(GetCategoriesByExcludedVideoIdQuery<TDto> query, CancellationToken cancellationToken)
        {

            var category = await _repository.GetCategoriesByExcludedVideoIdAsync(query.VideoId);
            if (category == null)
            {
                return QResult<List<TDto>>.Fail("Category not found");
            }

            List<TDto> categoryDto;
            try
            {
                categoryDto = _mapper.MapList<TDto>(category);
                return QResult<List<TDto>>.Ok(categoryDto);
            }
            catch (Exception ex)
            {
                return QResult<List<TDto>>.Fail(ex.Message);
            }
        }





    }
}
