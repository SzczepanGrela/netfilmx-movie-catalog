using NetFilmx_Service.Dtos.Video;
using NetFilmx_Storage.PostgreSql.Catalogue;

namespace NetFilmx_Web.Services;

public sealed record ArtworkCredit(string Role, string Creator, string SourceUrl, string? License,
    string? LicenseUrl, string Changes);
public sealed record FilmCredit(string Slug, string Title, string Creator, string Production,
    string SourceUrl, string? License, string? LicenseUrl, string Changes, string? Pending,
    ArtworkCredit[] Artwork);

public static class RetainedMediaCredits
{
    private const string By25 = "https://creativecommons.org/licenses/by/2.5/";
    private const string By30 = "https://creativecommons.org/licenses/by/3.0/";
    private const string By40 = "https://creativecommons.org/licenses/by/4.0/";
    private const string Crop = "Frame extracted at 00:45 and centre-cropped to 2:3. Display sizing may resize the image.";
    private const string Frame = "Frame extracted at 00:30. Display backgrounds may resize, crop and blur the image.";

    public static IReadOnlyList<FilmCredit> All { get; } = Array.AsReadOnly(new FilmCredit[]
    {
        new("sintel", "Sintel", "© Blender Foundation · Durian", "Director: Colin Levy. Music and sound: Jan Morgenstern.",
            "https://durian.blender.org/sharing/", "CC BY 3.0", By30,
            "Complete video retained. Surround audio downmixed to stereo AAC; ten subtitle tracks omitted from MP4. Original MKV retained.", null,
            [new("Poster", "© Blender Foundation · durian.blender.org. Concept and paint-over: David Revoy; character poses: Lee Salvemini; lighting/render: Pablo Vazquez.",
                "https://durian.blender.org/news/movie-poster/", "CC BY 3.0", By30,
                "Published poster retained unchanged; display sizing may resize it. Embedded logos have separate rights; no endorsement is implied.")]),
        new("tears-of-steel", "Tears of Steel", "© Blender Foundation · Mango", "Director: Ian Hubert. Music and sound: Joram Letwory.",
            "https://mango.blender.org/sharing/", "CC BY 3.0", By30, "Retained edition; complete closing credits preserved.", null,
            [new("Poster", "© Blender Foundation · Project Mango", "https://commons.wikimedia.org/wiki/File:Tos-poster.png", "CC BY 3.0", By30,
                "Published poster retained unchanged; display sizing may resize it. Embedded logos have separate rights; no endorsement is implied."),
             new("Backdrop", "© Blender Foundation · Project Mango", "https://commons.wikimedia.org/wiki/File:Tears_of_Steel_frame_08_4a.jpg", "CC BY 3.0", By30,
                "Published still retained unchanged. Display backgrounds may resize, crop and blur it.")]),
        new("charge", "Charge", "© Blender Foundation · Blender Studio", "Director: Hjalti Hjálmarsson. Music: Torin Borrowdale. Sound design: Sander Houtman.",
            "https://studio.blender.org/projects/charge/pages/credits/", "CC BY 4.0", By40, "Retained edition; complete closing credits preserved.", null,
            [new("Poster", "© Blender Foundation · Charge team", "https://studio.blender.org/projects/charge/", "CC BY 4.0", By40, Crop),
             new("Backdrop", "© Blender Foundation · Charge team", "https://studio.blender.org/projects/charge/", "CC BY 4.0", By40, Frame)]),
        new("elephants-dream", "Elephants Dream", "© 2006 Blender Foundation / Netherlands Media Art Institute · www.elephantsdream.org",
            "Director: Bassam Kurdali. Music and sound: Jan Morgenstern.", "https://orange.blender.org/blog/creative-commons-license-2/", "CC BY 2.5", By25,
            "Retained edition; complete closing credits preserved. The separately downloadable score has a different licence.", null,
            [new("Poster", "© 2006 Blender Foundation / Netherlands Media Art Institute · Elephants Dream team", "https://orange.blender.org/blog/creative-commons-license-2/", "CC BY 2.5", By25, Crop),
             new("Backdrop", "Blender Foundation · Ton Roosendaal and the Elephants Dream team", "https://orange.blender.org/wp-content/themes/orange/images/media/gallery/s5_both.jpg", "CC BY 2.5", By25,
                "Published still retained unchanged. Display backgrounds may resize, crop and blur it.")]),
        new("caminandes-llama-drama", "Caminandes: Llama Drama", "Caminandes · Pablo Vazquez, Beorn Leonard and Francesco Siddi",
            "Pablo Vazquez, Beorn Leonard and Francesco Siddi. Music and sound: Jan Morgenstern.", "https://www.youtube.com/watch?v=JOhiWY7XmoY", "CC BY 3.0", By30,
            "Full video/audio transcoded to H.264/stereo AAC. Ogg Skeleton container metadata omitted; complete closing credits preserved.", null,
            [new("Poster", "Caminandes · Pablo Vazquez, Beorn Leonard and Francesco Siddi", "https://www.youtube.com/watch?v=JOhiWY7XmoY", "CC BY 3.0", By30, Crop),
             new("Backdrop", "Caminandes · Pablo Vazquez, Beorn Leonard and Francesco Siddi", "https://www.youtube.com/watch?v=JOhiWY7XmoY", "CC BY 3.0", By30, Frame)]),
        new("caminandes-gran-dillama", "Caminandes: Gran Dillama", "Blender Foundation · Blender Institute (2013) · www.caminandes.org",
            "Director: Pablo Vazquez. Producer: Francesco Siddi. Writer: Beorn Leonard. Music and sound: Jan Morgenstern.",
            "https://download.blender.org/demo/movies/caminandes_gran_dillama.mp4.zip", "CC BY 3.0", By30,
            "Retained archive edition; licence and attribution follow its closing card. Complete closing credits preserved.", null,
            [new("Poster", "Blender Foundation · Caminandes team · www.caminandes.org", "https://download.blender.org/demo/movies/caminandes_gran_dillama.mp4.zip", "CC BY 3.0", By30, Crop),
             new("Backdrop", "Blender Foundation · Caminandes team · www.caminandes.org", "https://download.blender.org/demo/movies/caminandes_gran_dillama.mp4.zip", "CC BY 3.0", By30, Frame)]),
        new("caminandes-llamigos", "Caminandes: Llamigos", "© Blender Foundation · Blender Studio",
            "Director: Pablo Vazquez. Music: Torin Borrowdale. Sound design: Sander Houtman.", "https://studio.blender.org/projects/caminandes-3/pages/credits/", "CC BY 4.0", By40,
            "Retained edition; complete closing credits preserved.", null,
            [new("Poster", "© Blender Foundation · Llamigos team", "https://studio.blender.org/projects/caminandes-3/", "CC BY 4.0", By40, Crop),
             new("Backdrop", "© Blender Foundation · Llamigos team", "https://studio.blender.org/projects/caminandes-3/", "CC BY 4.0", By40, Frame)])
    });

    // Bind notices to the shipped manifest and configured origin. Titles and
    // generated DB IDs do not identify a retained film or prove its provenance.
    // Pending playback entries acquire per-film notices only after activation.
    public static FilmCredit? Find(VideoCardDto video, string? publicOrigin)
    {
        Uri origin;
        try { origin = CataloguePlan.ValidateBaseUrl(publicOrigin ?? ""); }
        catch (CatalogueImportException) { return null; }
        var item = CataloguePlan.Load().Videos.SingleOrDefault(item => item.PlaybackObjectKey is not null &&
            new Uri(origin, item.PlaybackObjectKey).AbsoluteUri == video.VideoUrl &&
            new Uri(origin, item.PosterObjectKey).AbsoluteUri == video.ThumbnailUrl &&
            (video.BackdropUrl is null || (item.BackdropObjectKey is not null &&
                new Uri(origin, item.BackdropObjectKey).AbsoluteUri == video.BackdropUrl)));
        return item is null ? null : All.Single(credit => credit.Slug == item.Slug);
    }
}
