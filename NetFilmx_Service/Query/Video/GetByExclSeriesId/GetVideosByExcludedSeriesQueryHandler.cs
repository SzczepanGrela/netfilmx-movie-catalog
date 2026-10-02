using NetFilmx_Service.Mappings;
using MediatR;
using NetFilmx_Service.Dtos.Video;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Query.Video
{
    public sealed class GetVideosByExcludedSeriesQueryHandler<TDto> : IRequestHandler<GetVideosByExcludedSeriesQuery<TDto>, QResult<List<TDto>>>
        where TDto : IVideoDto
    {
        private readonly IVideoRepository _repository;
        private readonly ICatalogueMapper _mapper;

        public GetVideosByExcludedSeriesQueryHandler(IVideoRepository repository, ICatalogueMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<List<TDto>>> Handle(GetVideosByExcludedSeriesQuery<TDto> query, CancellationToken cancellationToken)
        {
            List<TDto> videosDto;
            try
            {
                var videos = await _repository.GetVideosByExcludedSeriesIdAsync(query.SeriesId);
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
