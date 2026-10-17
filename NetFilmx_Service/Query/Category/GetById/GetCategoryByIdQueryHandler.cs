using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.Category;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.Category
{
    public sealed class GetCategoryByIdQueryHandler<TDto> : IRequestHandler<GetCategoryByIdQuery<TDto>, QResult<TDto>>
        where TDto : ICategoryDto
    {
        private readonly ICategoryRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetCategoryByIdQueryHandler(ICategoryRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<TDto>> Handle(GetCategoryByIdQuery<TDto> query, CancellationToken cancellationToken)
        {
            var category = await _repository.GetCategoryByIdAsync(query.Id);
            if (category == null)
            {
                return QResult<TDto>.Fail("Category not found");
            }

            TDto categoryDto;
            try
            {
                categoryDto = _mapper.Map<TDto>(category);
                return QResult<TDto>.Ok(categoryDto);
            }
            catch (Exception ex)
            {
                return QResult<TDto>.Fail(ex.Message);
            }
        }
    }
}
