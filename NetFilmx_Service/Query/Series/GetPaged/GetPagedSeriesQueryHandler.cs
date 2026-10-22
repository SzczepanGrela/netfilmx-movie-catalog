using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.Series;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace NetFilmx_Service.Query.Series
{
    public sealed class GetPagedSeriesQueryHandler<TDto> : IRequestHandler<GetPagedSeriesQuery<TDto>, QResult<PaginatedList<TDto>>>
        where TDto : ISeriesDto
    {
        private readonly ISeriesRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetPagedSeriesQueryHandler(ISeriesRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<PaginatedList<TDto>>> Handle(GetPagedSeriesQuery<TDto> query, CancellationToken cancellationToken)
        {
            try
            {
                var (seriesList, totalCount) = await _repository.GetPagedSeriesAsync(query.PageNumber, query.PageSize, query.SearchTerm);
                var seriesDto = _mapper.MapList<TDto>(seriesList);
                var paginatedList = new PaginatedList<TDto>(seriesDto, totalCount, query.PageNumber, query.PageSize);
                return QResult<PaginatedList<TDto>>.Ok(paginatedList);
            }
            catch (Exception ex)
            {
                return QResult<PaginatedList<TDto>>.Fail(ex.Message);
            }
        }
    }
}
