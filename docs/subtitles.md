# Subtitle preservation and player verification

## Implementation

The retained catalogue and newly processed uploads use persistent `VideoSubtitles`
rows: source track identifier, language tag, label, order and HTTPS WebVTT URL.
`(VideoId, TrackKey)` is unique. Repository/DTO mapping supplies the actual MVC
watch view, which places the tracks inside Vidstack's `media-provider`. Its
Captions menu selects a language or Off. Videos without subtitle rows still play.
Replacing a video's source detaches its old caption links; physical objects remain.

PostgreSQL and legacy SQLite have explicit `VideoSubtitles` migrations. HTTP
startup continues to check readiness without migrating. Apply reviewed migrations
through the existing separate database command before starting the new version.
The migrations add metadata/nullable processing fields; they do not replace media.

The player and its caption parser/icons/HLS library are pinned and served locally:
Vidstack CDN bundle 1.15.7, media-captions 1.0.4, media-icons 1.1.5 and hls.js 1.7.3.
The vendor script rewrites imports to those local copies and verifies the generated
inventory/content against the lockfile. Upstream licences are included; Vidstack's
licence comes from its published package's source commit
`68785ee03936c8e3610a9b73b790d42d0b2f2d79`. VOD/video attributes ensure controls
are available while HLS metadata loads. The player uses anonymous cross-origin
media/text access; target-domain CORS remains an acceptance requirement.

### Sintel: all ten source tracks

All ten original MKV subtitle tracks are prepared as WebVTT. The existing MP4's
video/audio bytes are reused; caption extraction does not re-encode either.
The original MKV remains intact. Each retained language contains 26 cues, matching
its decoded source count. A cue is one timed subtitle entry.

| Track | Language | Player label |
| --- | --- | --- |
| stream-2 | de | Deutsch |
| stream-3 | en | English |
| stream-4 | es | Español |
| stream-5 | fr | Français |
| stream-6 | it | Italiano |
| stream-7 | nl | Nederlands |
| stream-8 | pl | Polski |
| stream-9 | pt | Português |
| stream-10 | ru | Русский |
| stream-11 | vi | Tiếng Việt |

Manifest schema 2 includes all ten requirements with **null object keys**. It
also retains the two pending playback keys. Import refuses any missing playback
or subtitle object; no partial catalogue or runtime proposal override was added.
Prepared files, hashes and the inactive twelve-field patch remain private.
Other retained films keep their current MP4/WebM paths; no seven-film HLS conversion
was performed. Credits describe the preserved sidecars and pending publication.

### New uploads

The pipeline remains supported input → FFmpeg → H.264/yuv420p + AAC adaptive HLS.
Renditions depend on source dimensions; smaller inputs are not upscaled.
**Audio limitation:** only the first audio stream is selected and encoded as
stereo. Multiple audio choices are outside this change.

All declared subtitle streams are inspected. Supported text codecs are SubRip/SRT,
WebVTT, ASS/SSA, mov_text and text. Language aliases become language tags; original
titles are retained as labels, otherwise native language names are used. Missing
language metadata becomes `und`, labelled with its stream number. Selection is
optional; the viewer can turn captions off. WebVTT conversion may change styling;
ASS layout/fonts/drawings are not a promise of faithful rendering.

Unsupported/image formats stop processing with an administrator-visible error;
there is no OCR or silent track omission. Failed decoding, damaged UTF-8, missing/
empty/oversized output, invalid cue timing or a changed decoded cue count also stop
the job. mov_text display-clear packets are distinguished from visible cues.
Limits: 32 tracks, 64 KiB probe output, 8 MiB per WebVTT, bounded probe/conversion
processes with cancellation. Inputs outside these bounds require review.

Each attempt uses private output and a fresh publication namespace. VTT transfers
use `text/vtt; charset=utf-8`; HLS playlists/segments have explicit types. The master
is uploaded last. Every file transfer must finish before the job commits playback,
all subtitle links and `ProcessedUploadId` together. Duplicate delivery sees that
committed marker and does not create another set of links. Failed/cancelled work
retains its staged source and intent. Failed DB persistence rolls back readiness
and links; retry can finish without duplicates. Source cleanup follows confirmed
completion, and an administrator replacement cannot cause unfinished source cleanup.

`ProcessingError` is visible on the administrator's edit page. Resolve a rejected
source by reviewing it and supplying a corrected input; do not force a FAILED row
to ready to bypass caption preservation. Originals already retained in storage
are unaffected by job cleanup.

## Local verification

October 15 result: **294 .NET tests passed, zero failed/skipped**, including a
disposable PostgreSQL with no external network. Chromium 151 and Firefox 153
each passed the four actual-player scenarios below using Playwright 1.62.1.
Three DOM tests and the locked vendor check also passed. CI separately qualifies
the final image; local browser evidence does not claim final-image media acceptance.

Requirements: .NET 10, FFmpeg/ffprobe and a version-pinned Playwright installation
with Chromium/Firefox. Commands run from the candidate checkout. Use new private
output directories each time; these tools never upload to a provider.

```bash
dotnet restore "ST2 NetFilmx.sln" --locked-mode
dotnet build NetFilmx_Web/NetFilmx_Web.csproj -c Release --no-restore
dotnet restore qualification/Subtitles/Subtitles.csproj --locked-mode
dotnet build qualification/Subtitles/Subtitles.csproj -c Release --no-restore
dotnet qualification/Subtitles/bin/Release/net10.0/Subtitles.dll \
  fixture artifacts/subtitles/my-six-second-fixture

python3 infra/subtitles-check.py \
  artifacts/subtitles/my-six-second-fixture/fixture.json \
  artifacts/subtitles/my-chromium "$PLAYWRIGHT_PACKAGE_DIRECTORY"
python3 infra/subtitles-check.py \
  artifacts/subtitles/my-six-second-fixture/fixture.json \
  artifacts/subtitles/my-firefox "$PLAYWRIGHT_PACKAGE_DIRECTORY" --browser firefox
```

The fixture has a plain MP4, a captioned MP4 and three-rendition HLS from a six-second
720p source. Tests use the actual watch view and Vidstack menus: Polish/Russian/
English, Off, forward/back seeking, visible characters, decoded video frames and
keyboard choices. A controlled missing sidecar must show a message while another
language still works. Some empty responses otherwise parse as empty tracks, so
the UI checks that condition as well as explicit load errors. JSON and screenshots
are written to the chosen private evidence directories. The app and temporary keys
are removed after each run; reopening the same fixture DB checks persistent links.

Media requests are intercepted to private fixture files; other external requests
are denied. This is local player evidence, **not target HTTPS/CORS approval**.
The Linux Firefox setup may use private compatible codec libraries under artifacts;
that fixture is separate from system browser installation and native Apple devices.

Backend tests cover source extraction and UTF-8/times, mov_text clear packets,
no-subtitle input, unsupported/corrupt streams, source retention, failed transfer,
cancellation, DB rollback, retry/duplicate delivery and MVC restart persistence.
PostgreSQL tests verify actual migration/import and ten links after reopening.

```bash
dotnet test NetFilmx_Tests/NetFilmx_Tests.csproj -c Release \
  --filter 'FullyQualifiedName~Subtitle|FullyQualifiedName~CataloguePlanTests|FullyQualifiedName~R2StorageServiceTests'
```

## Production acceptance and inactive publication proposal

1. Review real Sintel sidecars for text, timing, styling and all ten labels, plus
   the existing MP4 stereo mix/quality and credits. Native Safari/mobile, audible
   sound and actual HTTPS-domain behavior stay open until tested.
2. Operator publishes the two accepted MP4s and ten WebVTT files to reviewed new
   keys, preserving originals. Keep acceptance/publication fields unfilled until
   the actual reviews/actions occur. The older two-field-only proposal is superseded.
3. Verify exact object identities, UTF-8/VTT MIME, media Range/seeks, cache and
   actual Origin/CORS behavior for the player. A loopback route supplying fixture
   headers does not complete this step.
4. Only then commit accepted manifest keys and qualify final-image real-media
   import, seven films/one series/three links/ten subtitles, restart and playback.

The local extractor and proposal generator can prepare reviewable files:

```bash
dotnet qualification/Subtitles/bin/Release/net10.0/Subtitles.dll \
  extract "$PRIVATE_SINTEL_MKV" artifacts/subtitles/new-sintel-vtt
python3 infra/prepare-subtitle-publication.py \
  artifacts/subtitles/new-sintel-vtt/subtitle-evidence.json \
  "$PRIVATE_DERIVATIVE_EVIDENCE" artifacts/subtitles/new-publication-proposal
```

PR #1 remains draft. Uploads/worker remain disabled. No production/provider write,
merge, deployment or private documentation/roadmap update is part of these tools.
