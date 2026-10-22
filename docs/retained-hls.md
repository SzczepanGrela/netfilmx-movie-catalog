# Retained catalogue: adaptive HLS preparation

October 17, 2026 operator scope change: prepare HLS for all seven retained
films, superseding the former two-MP4/ten-VTT publication proposal. Originals,
both existing MP4s, licensing/credits evidence, subtitle implementation and
earlier manual/browser observations remain preserved at their recorded scope.
No R2/VPS/Cloudflare mutation, merge, deployment or manifest activation is included.

## Shared encoder and source choice

`qualification/HlsCatalogue` calls `NetFilmx_Service.Processing.FFmpegService`,
the same encoder used by the upload worker. `PlanAsync` exposes its actual
arguments and ladder for evidence; the offline Python tools orchestrate and
verify outputs without implementing another FFmpeg command builder. The
application's uploads and worker flags remain false.

Inputs are the seven previously verified retained originals, not the prepared
Sintel/Llama MP4 derivatives. Lower-quality retained MP4s remain the authoritative
edition for this packet; preparation does not claim to recover missing detail.
No provider download or new edition/licence selection is needed.

| Film | Retained source | Actual coded HLS sizes | Total bytes including playlists/sidecars |
| --- | --- | --- | ---: |
| Sintel | H.264/AC-3 MKV, 1920×818 | 1920×818, 1280×544, 854×362 | 506141006 |
| Tears of Steel | H.264/AAC MP4, 862×360 | 862×360, 640×266, 426×176 | 172434534 |
| Charge | VP9/Opus WebM, 3840×1608 | 1920×804, 1280×536, 854×356 | 134127114 |
| Elephants Dream | H.264/AAC MP4, 426×240 | 426×240, 254×144 | 57844033 |
| Llama Drama | Theora/Vorbis OGV, 1920×1080 | 1920×1080, 1280×720, 852×480 | 43455920 |
| Gran Dillama | Retained BY 3.0 H.264/AAC MP4, 1920×1080 | 1920×1080, 1280×720, 852×480 | 85499313 |
| Llamigos | VP8/Vorbis WebM, 1920×1080 | 1920×1080, 1280×720, 852×480 | 84047503 |

The ladder fits both source axes into boxes up to 1920×1080, removes near-duplicate
levels and uses at most three sizes down to a 256×144 box. Small Elephants Dream
gets two levels. Even coded dimensions are rounded down; FFmpeg scaling retains
display aspect ratio through sample-aspect metadata. No crop, padded enlarged
canvas or upscaling is introduced. Quality labels show actual coded heights,
so a panoramic source may have an 818p/544p/362p menu rather than padded 1080p.

Encoding observed with FFmpeg/ffprobe **n9.0.2**:

- H.264 `libx264`, `yuv420p`, preset `fast`, CRF 23, two threads per rendition;
  one filter thread and two input decode threads.
- VBV target/max/buffer in kb/s: 2400/2600/3500, 1400/1550/2000,
  750/850/1100, 400/450/600, 350/400/500 or 160/220/320, selected by actual
  output pixel count. Full per-film arguments are in `encoding-plan.json`.
- First audio stream only, AAC stereo **128 kb/s, 48 kHz** in every rendition.
  Sintel's 5.1 input is downmixed. No multi-audio, global sync compensation,
  subtitle offset, OCR or audio replacement is added.
- VOD MPEG-TS HLS, six-second segment targets, closed GOPs, scene-cut keyframes
  disabled and forced keyframes at multiples of six seconds in every rendition.
  FFmpeg writes temporary files before final segment/playlist names.

See the primary [FFmpeg scaling documentation](https://ffmpeg.org/ffmpeg-filters.html#scale)
and [HLS muxer documentation](https://ffmpeg.org/ffmpeg-formats.html#hls).

### Measured Theora ending correction

The first Llama HLS advertised **88.75 s**, versus the original **89.907664 s**.
The source's final repeat packets did not become decoded frames, so playlist
duration followed the shorter video while audio continued. The shared encoder
now holds the final Theora still through the bounded original container duration;
it also treats unspecified Theora sample-aspect metadata as square while
preserving an explicit non-square value. Corrected HLS is **89.916667 s**, within
one source frame. The synthetic regression checks both duration and aspect ratio.
Failed intermediate outputs and reports remain in the private history folder.
Only Llama was re-encoded for these demonstrated failures; six passing outputs
were preserved. This is unrelated to the unresolved Sintel perception, which
has no audio/subtitle compensation or claimed root cause.

## Local preparation and verification

Use existing reviewed originals and a new private output directory. No commands
below publish objects or enable the application worker.

```bash
dotnet restore qualification/HlsCatalogue/HlsCatalogue.csproj --locked-mode
dotnet build qualification/HlsCatalogue/HlsCatalogue.csproj -c Release --no-restore
dotnet restore "ST2 NetFilmx.sln" --locked-mode
dotnet build NetFilmx_Web/NetFilmx_Web.csproj -c Release --no-restore
python3 qualification/retained_hls.py encode ORIGINALS_DIR NEW_PRIVATE_RUN --workers 2
python3 qualification/hls_package.py verify NEW_PRIVATE_RUN
python3 qualification/hls_package.py package NEW_PRIVATE_RUN
node qualification/hls_browser.cjs NEW_PRIVATE_RUN/publication-proposal/publication-record.json NEW_BROWSER_OUTPUT PLAYWRIGHT_PACKAGE_DIR
```

The local runner uses Playwright 1.62.1 plus the preserved Chromium and private
Firefox 153/codec fixture under artifacts. `hls_preview.py PACKET NEW_OUTPUT`
can start the same loopback-only app for a reviewer; it prints the origin, with
`/Home/Watch/1` through `/Home/Watch/7` in manifest order. Ctrl+C stops its owned
processes and retains the private DB/keys/evidence. No additional manual round is
requested. The fixture template is the preserved empty-account SQLite snapshot
`artifacts/subtitles/20261014-fixture-720p/catalogue.db`; it is not a release database.

The current restricted run is `artifacts/hls/20261017-catalogue/`. It contains
source/output sizes and SHA-256, real command plans, complete original probes,
per-rendition duration/bitrate/segment metadata and every object checksum.
Verification rejects incomplete VOD, missing/foreign/unsafe references, orphaned
files, wrong codecs/dimensions/SAR, upscaling, shortened duration, unaligned
boundaries, non-keyframe segment starts, subtitle changes and underestimated
bandwidth. Peak rate uses contiguous windows of 0.5–1.5 target durations per
[RFC 8216 §4.1](https://www.rfc-editor.org/rfc/rfc8216#section-4.1), including
container overhead; a one-frame ending alone is not a valid peak-rate window.
The verifier also records the first video DTS and final audio/video ends.
Browser completion is compared with that measured muxed timeline, since AAC
can extend beyond the video-only EXTINF sum (Llamigos: 150.2095 vs 150.041667 s).
This measurement changes no encoded timestamps or subtitle times.

The browser runner starts an actual Release MVC app against a disposable private
SQLite fixture, keeping production migration/import separate. It serves only
the prepared object inventory and retained artwork over loopback HTTPS and blocks
external browser requests. It exercises real hls.js/Vidstack variants, manual
quality selection with decoded-size checks, Auto, seeks, natural ending and all
ten Sintel languages/Off against unchanged sidecars. Chromium and the existing
private-codec Firefox setup are used. The runner terminates its own fixture/app
afterwards. These muted desktop-engine checks do not replace human listening,
native devices, production CORS or final-image PostgreSQL import/restart.

Actual HLS checks found two integration issues: native metadata could load before
hls.js and leave Vidstack's quality list empty, and an immediate whole-buffer
quality flush combined with seeking could prematurely end Chromium playback.
HLS now uses `preload="none"` and Vidstack's documented `qualities.switch = 'next'`
mode, keeping the current fragment while scheduling the new quality. hls.js
prefetch and retained history are bounded to 30 seconds (with segment granularity),
preventing a whole short film from being buffered before the first switch.
This is a player setting, not a production CPU/RAM limit. MP4 retains metadata
preload. The runner delays library delivery by 300 ms and selects/seeks
each real quality, checking decoded dimensions. Vendor files remain unchanged.
For ending checks it seeks three seconds before completion, then requires both
native-video and player ended states at the complete duration. Pinned Vidstack
rounds seek/end comparisons to whole seconds; seeking within the last fractional
second can be treated as completion. That existing vendor precision remains a
limitation; it is not counted as natural-ending evidence or corrected by cutting media.

The offline CLI's read-only `plan ORIGINAL HLS_DIRECTORY` command can compare
final shared arguments against existing encode records without converting again.
`final-plan-parity.json` passes for all seven outputs, including the six encoded
before the conditional Theora corrections. Each record keeps its actual DLL hash.

## Concrete publication proposal, inactive

`artifacts/hls/20261017-catalogue/publication-proposal/` contains:

- `publication-record.json`: 1398 exact objects, bytes/SHA-256, MIME/cache proposal,
  per-film master/bundle identifiers and still-null approval/publication fields.
- `objects.sha256`: all **1083549423 bytes** of payload, listed by local file.
- `upload-order.jsonl`: segments/VTT first, media playlists next, seven masters last.
- `proposed-retained-media.json` and `.patch`: seven HLS master references plus
  ten unchanged WebVTT references, with base/proposed manifest and patch hashes.
- The accompanying restricted technical report and operator-publication instructions.

Playback keys are `videos/hls/<slug>/<bundle-sha256>/master.m3u8`, with all relative
variant/segment references inside that same immutable prefix. The bundle hash
covers every playback file's name, length and checksum. VTTs keep the accepted
`subtitles/sintel/<language>/<sha256>.vtt` proposal and stable track keys/labels.
No schema/DTO migration is needed: existing `VideoUrl` supports `.m3u8` and the
accepted durable subtitle links remain in use.

Publication/readback and NHP17-1 are now accepted. On October 18 the operator
authorized activation of exactly **seventeen references** and local final-image
qualification. The embedded manifest now matches the approved proposal exactly.
The original packet retains its preparation-time metadata; current execution and
activation results live separately. The historical twelve-field patch stays unused.
HLS payloads/evidence remain ignored local artifacts.

## Later operator publication and image qualification

1. Review the exact packet and record explicit content/publication disposition,
   including unresolved Sintel sync and retained manual deferrals. Reduced testing
   is not publication approval. Choose the target bucket/origin and scoped
   object-write access without delete rights; preserve all existing objects.
2. Verify local hashes and unchanged shipping/proposed manifest identities.
   Publish the **exact relative tree**, using `upload-order.jsonl`: all segments
   and VTTs, then media playlists, masters last. A prefix/key conflict with
   different bytes holds publication; do not overwrite a source or older bundle.
3. Proposed MIME: `.m3u8` `application/vnd.apple.mpegurl`, `.ts` `video/mp2t`,
   `.vtt` `text/vtt; charset=utf-8`. Proposed cache is
   `public,max-age=31536000,immutable` because every namespace is content-versioned.
   Operator approves actual cache/CORS policy and reads back every published object.
4. Through the actual media HTTPS origin verify exact bytes/length, MIME, 206
   ranges, caching and CORS for the real app origin, including hls.js requests for
   every selected playlist/segment and anonymous subtitle fetches. Reject mixed
   content, missing objects or identity drift. ETags alone do not prove SHA-256.
5. Only after publication/readback separately activate seven master and ten VTT
   keys, then qualify the final image's explicit migrations/import/restart,
   seven films/one series/three links/ten tracks and real-media playback. Earlier
   recovery at 986e9aa remains synthetic-media evidence, not this final image.

Uploads/worker remain false; draft PR stays open. Coordinator owns protection,
production budgets/backups/bootstrap/cutover and private docs/roadmap updates.
The future UI/mobile/credits task and repository hygiene are outside this stage.
Do not ask for another Safari/VLC/device-version or full listening round: those
trials remain deferred, and earlier positive results keep their original scope.
