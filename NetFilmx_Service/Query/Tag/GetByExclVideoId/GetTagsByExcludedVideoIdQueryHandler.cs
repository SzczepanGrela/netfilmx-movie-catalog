using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.Tag;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.Tag
{
    public sealed class GetTagsByExcludedVideoIdQueryHandler<TDto> : IRequestHandler<GetTagsByExcludedVideoIdQuery<TDto>, QResult<List<TDto>>>
    where TDto : ITagDto
    {
        private readonly ITagRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetTagsByExcludedVideoIdQueryHandler(ITagRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<List<TDto>>> Handle(GetTagsByExcludedVideoIdQuery<TDto> query, CancellationToken cancellationToken)
        {
            var tags = await _repository.GetTagsByExcludedVideoIdAsync(query.VideoId);
            if (tags == null)
            {
                return QResult<List<TDto>>.Fail("Tags not found");
            }

            List<TDto> tagDto;
            try
            {
                tagDto = _mapper.MapList<TDto>(tags);
                return QResult<List<TDto>>.Ok(tagDto);
            }
            catch (Exception ex)
            {
                return QResult<List<TDto>>.Fail(ex.Message);
            }
        }
    }
}
