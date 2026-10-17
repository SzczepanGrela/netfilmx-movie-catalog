using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.Video;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.Video
{
    public sealed class GetVideoByIdQueryHandler<TDto> : IRequestHandler<GetVideoByIdQuery<TDto>, QResult<TDto>>
        where TDto : IVideoDto
    {
        private readonly IVideoRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetVideoByIdQueryHandler(IVideoRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<TDto>> Handle(GetVideoByIdQuery<TDto> query, CancellationToken cancellationToken)
        {
            var video = await _repository.GetVideoByIdAsync(query.VideoId);
            if (video == null)
            {
                return QResult<TDto>.Fail("Video not found");
            }
            TDto videoDto;
            try
            {
                videoDto = _mapper.Map<TDto>(video);
                return QResult<TDto>.Ok(videoDto);
            }
            catch (Exception ex)
            {
                return QResult<TDto>.Fail(ex.Message);
            }

        }
    }
}
