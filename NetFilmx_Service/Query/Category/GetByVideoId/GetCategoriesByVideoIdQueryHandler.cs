using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.Category;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.Category
{
    public sealed class GetCategoriesByVideoIdQueryHandler<TDto> : IRequestHandler<GetCategoriesByVideoIdQuery<TDto>, QResult<List<TDto>>>
        where TDto : ICategoryDto
    {
        private readonly ICategoryRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetCategoriesByVideoIdQueryHandler(ICategoryRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<List<TDto>>> Handle(GetCategoriesByVideoIdQuery<TDto> query, CancellationToken cancellationToken)
        {
            List<TDto> categoriesDto;
            try
            {
                var categories = await _repository.GetCategoriesByVideoIdAsync(query.VideoId);
                categoriesDto = _mapper.MapList<TDto>(categories);
                return QResult<List<TDto>>.Ok(categoriesDto);
            }
            catch (Exception ex)
            {
                return QResult<List<TDto>>.Fail(ex.Message);
            }
        }
    }
}
