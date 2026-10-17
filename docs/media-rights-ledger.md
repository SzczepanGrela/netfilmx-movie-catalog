# Retained artwork and visible attribution

Observed October 13, 2026. This ledger separates source identity, a source's
licence notice and operator acceptance. Source mapping does not approve release.
Retained media keys remain unchanged. The subtitle follow-up adds ten pending
WebVTT requirements; those and the two playback keys remain null.

## Exact Gran Dillama edition: CC BY 3.0

A complete sampled contact sheet of the retained film's final 26 seconds located
its brief licence card, missed by the earlier isolated timestamps. The card at
**02:24.5** states Creative Commons Attribution **3.0**, Blender Foundation and
`www.caminandes.org`. The retained MP4 is byte-identical to the movie member of
the [official Blender archive](https://download.blender.org/demo/movies/caminandes_gran_dillama.mp4.zip).
This is primary evidence tied to the exact retained edition; the full-resolution
card, archive identity and extraction command remain in the private packet.

The [current Studio asset](https://studio.blender.org/projects/caminandes-2/?asset=2363)
independently lists CC BY 4.0. Its downloaded MP4 differs from the retained archive
in bytes, duration and complete compressed video/audio packet hashes. That notice
is not used for the archive edition. Secondary Commons BY-SA 3.0 labels are also
not used: the retained edition's own card identifies BY 3.0, with no ShareAlike
condition. The old downloader label alone was not sufficient evidence.

Visible notices now use BY 3.0 for this retained film and its two proven frame
crops, with the card's attribution and change notices. No catalogue object or
manifest key was replaced. Source/licence evidence is complete for this question;
operator review of notices, marks and distribution remains pending. The earlier
open record is superseded by this exact-film card, not marked accepted by default.

## Thirteen artwork records

Four retained files are byte-identical to source publications. Nine are
pixel-identical to frames recreated from the retained originals with the
historical extractor's timestamp/crop/quality settings. JPEG bytes can differ
while decoded pixels match. The latter establishes the extracted image's
relationship to a film, rather than trusting the old downloader's filename.
Exact hashes, dimensions, comparison copies and reproduction commands stay
private in the artwork evidence packet.

| Film / artwork | Source and creator | Licence evidence / modification notice |
| --- | --- | --- |
| Sintel / poster | [Project poster article](https://durian.blender.org/news/movie-poster/); © Blender Foundation / Durian. David Revoy: concept/paint-over; Lee Salvemini: poses; Pablo Vazquez: lighting/render. [Project team](https://durian.blender.org/about/) supplies full names | Exact [published poster](https://commons.wikimedia.org/wiki/File:Sintel_poster.jpg), CC BY 3.0 under [project sharing terms](https://durian.blender.org/sharing/). File unchanged. Preserve its credit strip and review embedded logos separately |
| Tears of Steel / poster | [Original publication](https://mango.blender.org/production/press-release-premiere/); © Blender Foundation / Project Mango | Exact [published poster](https://commons.wikimedia.org/wiki/File:Tos-poster.png), CC BY 3.0 under [sharing terms](https://mango.blender.org/sharing/). File unchanged; embedded logos excluded from blanket CC permission |
| Tears of Steel / backdrop | Same primary publication/creator; Derek de Lint is the portrayed actor, not the image author | Exact [published still](https://commons.wikimedia.org/wiki/File:Tears_of_Steel_frame_08_4a.jpg), CC BY 3.0. File unchanged; display may resize/crop/blur |
| Charge / poster | Retained film, 00:45 centre crop; © Blender Foundation / [Charge team](https://studio.blender.org/projects/charge/pages/credits/) | Own film CC BY 4.0 card. Extracted and centre-cropped to 2:3; not the official poster |
| Charge / backdrop | Retained film, 00:30; same creator | CC BY 4.0; frame extraction, display resize/crop/blur |
| Elephants Dream / poster | Retained film, 00:45 centre crop; © 2006 Blender Foundation / Netherlands Media Art Institute / www.elephantsdream.org | [Primary sharing terms](https://orange.blender.org/blog/creative-commons-license-2/), CC BY 2.5. Exact pixel match disproves the missing Commons filename as this file's required source. Extracted/cropped to 2:3 |
| Elephants Dream / backdrop | Exact [primary gallery image](https://orange.blender.org/wp-content/themes/orange/images/media/gallery/s5_both.jpg); film/project team, credited by [Commons](https://commons.wikimedia.org/wiki/File:Elephants_Dream_s5_both.jpg) as Ton Roosendaal et al. | Same primary CC BY 2.5 terms. File unchanged; display resize/crop/blur. Preserve film-part copyright notice |
| Llama Drama / poster | Retained OGV, 00:45 centre crop; Caminandes: Pablo Vazquez, Beorn Leonard, Francesco Siddi | Own film card: CC BY 3.0 / caminandes.com; [official episode](https://www.youtube.com/watch?v=JOhiWY7XmoY). Pixel match establishes extraction, replacing the missing Commons poster lead |
| Llama Drama / backdrop | Same original OGV, 00:30; same creators | CC BY 3.0; extraction and display resize/crop/blur. The separately encoded parent MP4 is not the matching pixel source |
| Gran Dillama / poster | Retained archive film, 00:45 centre crop; Blender Foundation / [Caminandes team](https://studio.blender.org/projects/caminandes-2/pages/credits/) | Exact pixels; retained film’s own closing card: **CC BY 3.0**. Extracted/cropped to 2:3 |
| Gran Dillama / backdrop | Same retained film, 00:30; same creators | Exact pixels; same own CC BY 3.0 card. Extraction/display resize/crop/blur |
| Llamigos / poster | Retained film, 00:45 centre crop; © Blender Foundation / [Llamigos team](https://studio.blender.org/projects/caminandes-3/pages/credits/) | Own edition card: CC BY 4.0, overriding secondary BY 3.0 labels. Extracted/cropped to 2:3 |
| Llamigos / backdrop | Same retained film, 00:30; same creators | CC BY 4.0; extraction/display resize/crop/blur |

## Visible notices

`/Home/Credits` presents all seven films and thirteen graphics, with authors,
source links, licence links and crop/conversion notices, including Gran Dillama’s
retained-edition BY 3.0 card. It is linked from the footer throughout the catalogue, including
series views. Detail/watch pages additionally show their own notice when both
playback and artwork match the shipped manifest and configured media origin.
Unrelated uploads, a matching title or a generated database ID cannot acquire
these retained-film notices. Pending derivatives do not resolve until their
accepted manifest keys are committed. The credits follow-up introduced no database
schema change; the later [subtitle implementation](subtitles.md) adds explicit
metadata migrations and describes Sintel's ten preserved WebVTT sidecars.

Charge and Llamigos both credit Torin Borrowdale for music and Sander Houtman
for sound; their full scrolls remain intact. Llama Drama credits its own named
creators rather than inferring ownership from a Blender logo. Elephants Dream's
standalone score licence remains distinct from the film mix. The footer no
longer suggests that NetFilmx reserves all rights to the third-party films.
The details poster uses `contain` to preserve its entire printed credit strip.

Acceptance still requires the operator's review of notices/display crops,
embedded marks and the source/licence evidence. No legal-clearance or production
claim follows from this patch. Any artwork replacement/omission must be explicit
and reviewed, without silently changing the seven-film catalogue.
