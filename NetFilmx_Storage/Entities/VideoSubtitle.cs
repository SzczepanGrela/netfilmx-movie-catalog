using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.RegularExpressions;

namespace NetFilmx_Storage.Entities;

[Table("VideoSubtitles")]
public sealed class VideoSubtitle : BaseEntity
{
    private VideoSubtitle() { }

    public VideoSubtitle(string trackKey, string language, string label, string url, int position)
    {
        if (!ValidMetadata(trackKey, language, label, position) ||
            !Uri.TryCreate(url, UriKind.Absolute, out var source) || source.Scheme != "https" ||
            source.UserInfo.Length != 0 || source.Query.Length != 0 || source.Fragment.Length != 0 || url.Length > 2048)
            throw new ArgumentException("Invalid subtitle metadata or HTTPS source.");
        TrackKey = trackKey; Language = language; Label = label; Url = source.AbsoluteUri; Position = position;
    }

    public int VideoId { get; set; }
    public Video Video { get; set; } = null!;
    [MaxLength(64)] public string TrackKey { get; private set; } = null!;
    [MaxLength(35)] public string Language { get; private set; } = null!;
    [MaxLength(100)] public string Label { get; private set; } = null!;
    [MaxLength(2048)] public string Url { get; private set; } = null!;
    public int Position { get; private set; }

    public static bool ValidMetadata(string? key, string? language, string? label, int position) =>
        key is { Length: > 0 and <= 64 } && Regex.IsMatch(key, @"\A[a-z0-9]+(?:-[a-z0-9]+)*\z") &&
        language is { Length: > 0 and <= 35 } && Regex.IsMatch(language, @"\A[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*\z") &&
        !string.IsNullOrWhiteSpace(label) && label.Length <= 100 && !label.Any(char.IsControl) &&
        position is >= 0 and < 32;
}
