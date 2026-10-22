using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.Tag;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.Tag
{
    public class GetTagByNameQueryHandler<TDto> : IRequestHandler<GetTagByNameQuery<TDto>, QResult<TDto>>
        where TDto : ITagDto
    {
        private readonly ITagRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetTagByNameQueryHandler(ITagRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<TDto>> Handle(GetTagByNameQuery<TDto> query, CancellationToken cancellationToken)
        {
            var tag = await _repository.GetTagByNameAsync(query.TagName);
            if (tag == null)
            {
                return QResult<TDto>.Fail("Tag not found");
            }
            TDto tagDto;
            try
            {
                tagDto = _mapper.Map<TDto>(tag);
                return QResult<TDto>.Ok(tagDto);
            }
            catch (Exception ex)
            {
                return QResult<TDto>.Fail(ex.Message);
            }

        }
    }
}
