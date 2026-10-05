using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.Comment;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.Comment
{
    public sealed class GetCommentByIdQueryHandler<TDto> : IRequestHandler<GetCommentByIdQuery<TDto>, QResult<TDto>>
        where TDto : ICommentDto
    {
        private readonly ICommentRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetCommentByIdQueryHandler(ICommentRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<TDto>> Handle(GetCommentByIdQuery<TDto> query, CancellationToken cancellationToken)
        {
            try
            {
                var comment = await _repository.GetCommentByIdAsync(query.CommentId);
                if (comment == null)
                {
                    return QResult<TDto>.Fail("Comment not found");
                }

                var commentDto = _mapper.Map<TDto>(comment);
                return QResult<TDto>.Ok(commentDto);
            }
            catch (Exception ex)
            {
                return QResult<TDto>.Fail(ex.Message);
            }
        }
    }
}
