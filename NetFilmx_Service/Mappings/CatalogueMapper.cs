using NetFilmx_Storage.Entities;
using NetFilmx_Service.Dtos.Category;
using NetFilmx_Service.Dtos.Comment;
using NetFilmx_Service.Dtos.Like;
using NetFilmx_Service.Dtos.Series;
using NetFilmx_Service.Dtos.SeriesPurchase;
using NetFilmx_Service.Dtos.Tag;
using NetFilmx_Service.Dtos.User;
using NetFilmx_Service.Dtos.Video;
using NetFilmx_Service.Dtos.VideoPurchase;

namespace NetFilmx_Service.Mappings;

public interface ICatalogueMapper
{
    TDto Map<TDto>(object source);
    List<TDto> MapList<TDto>(IEnumerable<object> source);
}

// Only scalar catalogue fields are copied. No reflection, recursive graph mapping,
// navigation-property enumeration, password hashes or refresh sessions.
public sealed class CatalogueMapper : ICatalogueMapper
{
    public List<TDto> MapList<TDto>(IEnumerable<object> source) => source.Select(Map<TDto>).ToList();

    public TDto Map<TDto>(object source)
    {
        ArgumentNullException.ThrowIfNull(source);
        object dto = (source, typeof(TDto)) switch
        {
            (Category v, var target) when target == typeof(CategoryAddDto) =>
                new CategoryAddDto(v.Name, v.Description),
            (Category v, var target) when target == typeof(CategoryDetailsDto) =>
                new CategoryDetailsDto(v.Id, v.Name, v.Description),
            (Category v, var target) when target == typeof(CategoryEditDto) =>
                new CategoryEditDto(v.Name, v.Description, v.Id),
            (Category v, var target) when target == typeof(CategoryListDto) =>
                new CategoryListDto(v.Name, v.Id),
            (Comment v, var target) when target == typeof(CommentAddDto) =>
                new CommentAddDto(v.UserId, v.VideoId, v.Content),
            (Comment v, var target) when target == typeof(CommentDetailsDto) =>
                new CommentDetailsDto(v.Id, v.VideoId, v.UserId, v.Content, v.CreatedAt, v.UpdatedAt),
            (Comment v, var target) when target == typeof(CommentEditDto) =>
                new CommentEditDto(v.Id, v.Content),
            (Comment v, var target) when target == typeof(CommentListDto) =>
                new CommentListDto(v.Id, v.UserId, v.VideoId, v.Content, v.UpdatedAt),
            (Like v, var target) when target == typeof(LikeAddDto) =>
                new LikeAddDto(v.VideoId, v.UserId),
            (Like v, var target) when target == typeof(LikeDto) =>
                new LikeDto(v.Id, v.VideoId, v.UserId, v.CreatedAt),
            (Series v, var target) when target == typeof(SeriesAddDto) =>
                new SeriesAddDto(v.Name, v.Description, v.Price),
            (Series v, var target) when target == typeof(SeriesCardDto) =>
                new SeriesCardDto(v.Id, v.Name, v.Description, v.Price, v.PosterUrl, v.BackdropUrl, v.LogoUrl, v.TrailerUrl, v.ReleaseYear, v.Director, v.Cast, v.AgeRating, v.QualityBadge),
            (Series v, var target) when target == typeof(SeriesDetailsDto) =>
                new SeriesDetailsDto(v.Id, v.Name, v.Description, v.Price, v.CreatedAt, v.UpdatedAt),
            (Series v, var target) when target == typeof(SeriesEditDto) =>
                new SeriesEditDto(v.Id, v.Name, v.Description, v.Price),
            (Series v, var target) when target == typeof(SeriesListDto) =>
                new SeriesListDto(v.Name, v.Price, v.Id),
            (SeriesPurchase v, var target) when target == typeof(SeriesPurchaseAddDto) =>
                new SeriesPurchaseAddDto(v.SeriesId, v.UserId),
            (SeriesPurchase v, var target) when target == typeof(SeriesPurchaseDetailsDto) =>
                new SeriesPurchaseDetailsDto(v.Id, v.UserId, v.SeriesId, v.PurchaseDate),
            (SeriesPurchase v, var target) when target == typeof(SeriesPurchaseListDto) =>
                new SeriesPurchaseListDto(v.UserId, v.SeriesId, v.PurchaseDate),
            (Tag v, var target) when target == typeof(TagAddDto) =>
                new TagAddDto(v.Name),
            (Tag v, var target) when target == typeof(TagDetailsDto) =>
                new TagDetailsDto(v.Id, v.Name),
            (Tag v, var target) when target == typeof(TagEditDto) =>
                new TagEditDto(v.Id, v.Name),
            (Tag v, var target) when target == typeof(TagListDto) =>
                new TagListDto(v.Name, v.Id),
            (User v, var target) when target == typeof(UserAddDto) =>
                new UserAddDto(v.Username, v.Email, string.Empty),
            (User v, var target) when target == typeof(UserDetailsDto) =>
                new UserDetailsDto(v.Id, v.Username, v.Email, v.CreatedAt, v.UpdatedAt),
            (User v, var target) when target == typeof(UserEditDto) =>
                new UserEditDto(v.Id, v.Username, v.Email),
            (User v, var target) when target == typeof(UserListDto) =>
                new UserListDto(v.Username, v.Email, v.Id),
            (User v, var target) when target == typeof(UserPasswordDto) =>
                new UserPasswordDto(v.Id, string.Empty),
            (Video v, var target) when target == typeof(VideoAddDto) =>
                new VideoAddDto(v.Title, v.Price, v.VideoUrl, v.ThumbnailUrl, v.Description),
            (Video v, var target) when target == typeof(VideoCardDto) =>
                new VideoCardDto(v.Id, v.Title, v.Description, v.VideoUrl, v.ThumbnailUrl, v.Price, v.BackdropUrl, v.LogoUrl, v.TrailerUrl, v.ReleaseYear, v.DurationMinutes, v.Director, v.Cast, v.AgeRating, v.QualityBadge, v.MaturityWarning),
            (Video v, var target) when target == typeof(VideoDetailsDto) =>
                new VideoDetailsDto(v.Id, v.Title, v.Description, v.VideoUrl, v.ThumbnailUrl, v.Price, v.CreatedAt, v.UpdatedAt),
            (Video v, var target) when target == typeof(VideoEditDto) =>
                new VideoEditDto(v.Id, v.Title, v.VideoUrl, v.ThumbnailUrl, v.Description, v.Price),
            (Video v, var target) when target == typeof(VideoListDto) =>
                new VideoListDto(v.Id, v.Title, v.ThumbnailUrl, v.Price),
            (VideoPurchase v, var target) when target == typeof(VideoPurchaseAddDto) =>
                new VideoPurchaseAddDto(v.UserId, v.VideoId),
            (VideoPurchase v, var target) when target == typeof(VideoPurchaseDetailsDto) =>
                new VideoPurchaseDetailsDto(v.UserId, v.VideoId, v.PurchaseDate),
            (VideoPurchase v, var target) when target == typeof(VideoPurchaseListDto) =>
                new VideoPurchaseListDto(v.VideoId, v.UserId, v.PurchaseDate),
            _ => throw new NotSupportedException($"Catalogue mapping from {source.GetType().Name} to {typeof(TDto).Name} is not supported.")
        };
        return (TDto)dto;
    }
}
