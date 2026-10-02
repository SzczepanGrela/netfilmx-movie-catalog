using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.Video;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.Video
{
    public sealed class GetVideosByUserIdQueryHandler<TDto> : IRequestHandler<GetVideosByUserIdQuery<TDto>, QResult<List<TDto>>>
        where TDto : IVideoDto
    {
        private readonly IVideoRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetVideosByUserIdQueryHandler(IVideoRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<List<TDto>>> Handle(GetVideosByUserIdQuery<TDto> query, CancellationToken cancellationToken)
        {

            List<TDto> videosDto;
            try
            {
                var videos = await _repository.GetVideosByUserIdAsync(query.UserId);
                videosDto = _mapper.MapList<TDto>(videos);
                return QResult<List<TDto>>.Ok(videosDto);
            }
            catch (Exception ex)
            {
                return QResult<List<TDto>>.Fail(ex.Message);
            }

        }
    }
}
