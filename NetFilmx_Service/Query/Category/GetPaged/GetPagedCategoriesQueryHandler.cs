using AutoMapper;
using MediatR;
using NetFilmx_Service.Dtos.Category;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace NetFilmx_Service.Query.Category
{
    public sealed class GetPagedCategoriesQueryHandler<TDto> : IRequestHandler<GetPagedCategoriesQuery<TDto>, QResult<PaginatedList<TDto>>>
        where TDto : ICategoryDto
    {
        private readonly ICategoryRepository _repository;
        private readonly IMapper _mapper;

        public GetPagedCategoriesQueryHandler(ICategoryRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<PaginatedList<TDto>>> Handle(GetPagedCategoriesQuery<TDto> query, CancellationToken cancellationToken)
        {
            try
            {
                var (categories, totalCount) = await _repository.GetPagedCategoriesAsync(query.PageNumber, query.PageSize, query.SearchTerm);
                var categoriesDto = _mapper.Map<List<TDto>>(categories);
                var paginatedList = new PaginatedList<TDto>(categoriesDto, totalCount, query.PageNumber, query.PageSize);
                return QResult<PaginatedList<TDto>>.Ok(paginatedList);
            }
            catch (Exception ex)
            {
                return QResult<PaginatedList<TDto>>.Fail(ex.Message);
            }
        }
    }
}
