using AutoMapper;
using MediatR;
using NetFilmx_Service.Dtos.Video;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace NetFilmx_Service.Query.Video
{
    public sealed class GetPagedVideosQueryHandler<TDto> : IRequestHandler<GetPagedVideosQuery<TDto>, QResult<PaginatedList<TDto>>>
        where TDto : IVideoDto
    {
        private readonly IVideoRepository _repository;
        private readonly IMapper _mapper;

        public GetPagedVideosQueryHandler(IVideoRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<PaginatedList<TDto>>> Handle(GetPagedVideosQuery<TDto> query, CancellationToken cancellationToken)
        {
            try
            {
                var (videos, totalCount) = await _repository.GetPagedVideosAsync(query.PageNumber, query.PageSize, query.SearchTerm);
                var videosDto = _mapper.Map<List<TDto>>(videos);
                var paginatedList = new PaginatedList<TDto>(videosDto, totalCount, query.PageNumber, query.PageSize);
                return QResult<PaginatedList<TDto>>.Ok(paginatedList);
            }
            catch (Exception ex)
            {
                return QResult<PaginatedList<TDto>>.Fail(ex.Message);
            }
        }
    }
}
