namespace NetFilmx_Service.Dtos.Video;

public sealed record VideoSubtitleDto(string TrackKey, string Language, string Label, string Url, int Position);
