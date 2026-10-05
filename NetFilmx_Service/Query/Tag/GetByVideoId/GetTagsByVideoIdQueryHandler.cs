using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.Tag;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.Tag
{
    public class GetTagsByVideoIdQueryHandler<TDto> : IRequestHandler<GetTagsByVideoIdQuery<TDto>, QResult<List<TDto>>>
        where TDto : ITagDto
    {
        private readonly ITagRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetTagsByVideoIdQueryHandler(ITagRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<List<TDto>>> Handle(GetTagsByVideoIdQuery<TDto> query, CancellationToken cancellationToken)
        {

            List<TDto> tagsDto;
            try
            {
                var tags = await _repository.GetTagsByVideoIdAsync(query.VideoId);
                tagsDto = _mapper.MapList<TDto>(tags);
                return QResult<List<TDto>>.Ok(tagsDto);
            }
            catch (Exception ex)
            {
                return QResult<List<TDto>>.Fail(ex.Message);
            }

        }
    }
}
