using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.Tag;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace NetFilmx_Service.Query.Tag
{
    public sealed class GetPagedTagsQueryHandler<TDto> : IRequestHandler<GetPagedTagsQuery<TDto>, QResult<PaginatedList<TDto>>>
        where TDto : ITagDto
    {
        private readonly ITagRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetPagedTagsQueryHandler(ITagRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<PaginatedList<TDto>>> Handle(GetPagedTagsQuery<TDto> query, CancellationToken cancellationToken)
        {
            try
            {
                var (tags, totalCount) = await _repository.GetPagedTagsAsync(query.PageNumber, query.PageSize, query.SearchTerm);
                var tagsDto = _mapper.MapList<TDto>(tags);
                var paginatedList = new PaginatedList<TDto>(tagsDto, totalCount, query.PageNumber, query.PageSize);
                return QResult<PaginatedList<TDto>>.Ok(paginatedList);
            }
            catch (Exception ex)
            {
                return QResult<PaginatedList<TDto>>.Fail(ex.Message);
            }
        }
    }
}
