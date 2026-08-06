using AutoMapper;
using NetFilmx_Service.Command.Series;
using NetFilmx_Service.Dtos.Series;
using NetFilmx_Storage.Entities;

namespace NetFilmx_Service.Mappings
{
    public class SeriesMappingProfile : Profile
    {

        public SeriesMappingProfile()
        {

            CreateMap<Series, SeriesCardDto>();
            CreateMap<Series, SeriesDetailsDto>();
            CreateMap<Series, SeriesListDto>();
            CreateMap<Series, SeriesEditDto>();
            CreateMap<Series, SeriesAddDto>();


            CreateMap<SeriesEditDto, EditSeriesCommand>();
            CreateMap<SeriesAddDto, AddSeriesCommand>();


        }

    }
}
