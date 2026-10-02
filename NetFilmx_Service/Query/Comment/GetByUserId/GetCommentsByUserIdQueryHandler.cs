using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.Comment;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.Comment
{
    public sealed class GetCommentsByUserIdQueryHandler<TDto> : IRequestHandler<GetCommentsByUserIdQuery<TDto>, QResult<List<TDto>>>
        where TDto : ICommentDto
    {
        private readonly ICommentRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetCommentsByUserIdQueryHandler(ICommentRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<List<TDto>>> Handle(GetCommentsByUserIdQuery<TDto> query, CancellationToken cancellationToken)
        {

            List<TDto> commentsDto;
            try
            {
                var comments = await _repository.GetCommentsByUserIdAsync(query.UserId);
                commentsDto = _mapper.MapList<TDto>(comments);
                return QResult<List<TDto>>.Ok(commentsDto);
            }
            catch (Exception ex)
            {
                return QResult<List<TDto>>.Fail(ex.Message);
            }

        }
    }
}
