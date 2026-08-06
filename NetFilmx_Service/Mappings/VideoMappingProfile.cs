using AutoMapper;
using NetFilmx_Service.Command.Video;
using NetFilmx_Service.Dtos.Video;
using NetFilmx_Storage.Entities;

namespace NetFilmx_Service.Mappings
{
    public class VideoMappingProfile : Profile
    {

        public VideoMappingProfile()
        {
            CreateMap<Video, VideoCardDto>();
            CreateMap<Video, VideoListDto>();
            CreateMap<Video, VideoDetailsDto>();
            CreateMap<Video, VideoAddDto>();
            CreateMap<Video, VideoEditDto>();

            CreateMap<VideoEditDto, EditVideoCommand>();
            CreateMap<VideoAddDto, AddVideoCommand>();

        }


    }
}
