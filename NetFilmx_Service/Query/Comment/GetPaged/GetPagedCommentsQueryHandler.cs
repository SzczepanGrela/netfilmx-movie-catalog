using AutoMapper;
using MediatR;
using NetFilmx_Service.Dtos.Comment;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace NetFilmx_Service.Query.Comment
{
    public sealed class GetPagedCommentsQueryHandler<TDto> : IRequestHandler<GetPagedCommentsQuery<TDto>, QResult<PaginatedList<TDto>>>
        where TDto : ICommentDto
    {
        private readonly ICommentRepository _repository;
        private readonly IMapper _mapper;

        public GetPagedCommentsQueryHandler(ICommentRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<PaginatedList<TDto>>> Handle(GetPagedCommentsQuery<TDto> query, CancellationToken cancellationToken)
        {
            try
            {
                var (comments, totalCount) = await _repository.GetPagedCommentsAsync(query.PageNumber, query.PageSize, query.SearchTerm);
                var commentsDto = _mapper.Map<List<TDto>>(comments);
                var paginatedList = new PaginatedList<TDto>(commentsDto, totalCount, query.PageNumber, query.PageSize);
                return QResult<PaginatedList<TDto>>.Ok(paginatedList);
            }
            catch (Exception ex)
            {
                return QResult<PaginatedList<TDto>>.Fail(ex.Message);
            }
        }
    }
}
