using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.Comment;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.Comment
{
    public sealed class GetCommentsByVideoIdQueryHandler<TDto> : IRequestHandler<GetCommentsByVideoIdQuery<TDto>, QResult<List<TDto>>>
    where TDto : ICommentDto
    {
        private readonly ICommentRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetCommentsByVideoIdQueryHandler(ICommentRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<List<TDto>>> Handle(GetCommentsByVideoIdQuery<TDto> query, CancellationToken cancellationToken)
        {

            List<TDto> commentsDto;
            try
            {
                var comments = await _repository.GetCommentsByVideoIdAsync(query.VideoId);
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
