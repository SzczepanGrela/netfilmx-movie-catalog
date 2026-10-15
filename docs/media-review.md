# Retained media review and offline proposals

Observed 2026-10-13. This is preparation for operator review; distribution,
artwork, browser support and provider delivery are not accepted by this record.
The seven retained source objects and thirteen mapped artwork objects were read
through the current public media origin. No provider object or setting changed.
Full copies, sizes, probes, content hashes, proposed versioned keys and the
manifest proposal are restricted to ignored `artifacts/media-review/`.

## Identity and primary rights evidence

Each film's own licence/credit cards are primary evidence for that edition.
Screenshots and timestamps are retained privately, alongside the complete film.
Website defaults and a third party's licence badge do not replace those cards.
The following table describes evidence, not an approval to distribute.

| Title | Identity and primary evidence | Credit/exception and remaining input |
| --- | --- | --- |
| Sintel | Retained MKV is byte-identical to the [official source](https://download.blender.org/demo/movies/Sintel.2010.1080p.mkv); film card and [project licence](https://durian.blender.org/about/) state CC BY 3.0 | Blender Foundation/Durian; director Colin Levy, music and sound Jan Morgenstern. Preserve complete credits. Review the exact poster against [sharing conditions](https://durian.blender.org/sharing/), including marks/DVD-cover exceptions. Accept the proposed stereo mix and subtitle handling |
| Tears of Steel | Retained and parent copies have identical video/audio packet payloads; complete credits identify the film. [Project licence](https://mango.blender.org/about/) states CC BY 3.0; [official credits](https://mango.blender.org/credits/movie-scroll-credits/) | Blender Foundation/Mango; director Ian Hubert, music and sound Joram Letwory. Record the distributor/changes for the retained edition and individual poster/still attribution; actor/portrait and mark permissions need their appropriate scope |
| Charge | Retained copy matches the parent byte-for-byte; its closing licence card states CC BY 4.0 and Blender Foundation. [Official project](https://studio.blender.org/projects/charge/) and [credits](https://studio.blender.org/projects/charge/pages/credits/) | Director Hjalti Hjálmarsson; music Torin Borrowdale, sound design Sander Houtman. Preserve the full credit scroll. The retained poster is a frame crop, not the official movie poster. Record extraction attribution/change notice; [available sound tracks](https://studio.blender.org/remixing/) do not grant a new licence to unrelated music |
| Elephants Dream | Retained and parent copies have identical video/audio packet payloads. [Official press release](https://orange.blender.org/press/) states CC BY 2.5; [sharing conditions](https://orange.blender.org/blog/creative-commons-license-2/) and the film's copyright card identify the owners | Blender Foundation / Netherlands Media Art Institute, director Bassam Kurdali; music Jan Morgenstern. Full film credits are required. [Separately downloadable score](https://orange.blender.org/blog/complete-score-available-for-download/) is BY-NC-ND 2.5; the composer explicitly distinguishes it from the film mix. Preserve texture-specific attributions and logo/DVD-cover exceptions; review the exact retained still/crop |
| Caminandes: Llama Drama | Retained OGV matches the named reference copy; its own closing card states CC BY 3.0. [Official episode](https://www.youtube.com/watch?v=JOhiWY7XmoY) | Pablo Vazquez, Beorn Leonard, Francesco Siddi; music and sound Jan Morgenstern, confirmed in the film. Preserve the cards and credit the crop/extracted backdrop; establish the poster's specific provenance |
| Caminandes: Gran Dillama | Retained MP4 is byte-identical to the member of the [official archive](https://download.blender.org/demo/movies/caminandes_gran_dillama.mp4.zip). Its credits identify the team; [official project](https://studio.blender.org/projects/caminandes-2/) | Director Pablo Vazquez, producer Francesco Siddi; music/sound Jan Morgenstern. Its own card at 02:24.5 confirms **CC BY 3.0**, Blender Foundation / www.caminandes.org. Exact card/identity retained privately; see [follow-up ledger](media-rights-ledger.md). Current Studio BY 4.0 and secondary BY-SA labels do not identify this archive edition |
| Caminandes: Llamigos | Retained copy matches parent bytes; its closing card states **CC BY 4.0**. [Official film record](https://studio.blender.org/projects/caminandes-3/?asset=2417) and [credits](https://studio.blender.org/projects/caminandes-3/pages/credits/) identify the production | Director Pablo Vazquez; **music Torin Borrowdale**, sound Sander Houtman. Preserve complete credits. Record crop/backdrop changes. [Remixing guidance](https://studio.blender.org/remixing/) offers FX without music; it must not be treated as permission to replace or separately redistribute the score |

The former generated manifest's common BY 3.0 badge must not be reused. Charge
and the retained Llamigos edition carry BY 4.0; Elephants Dream uses BY 2.5.
Keep a title/creator/source/licence link and applicable modification notice near
the public film/artwork presentation, in addition to the intact film credits.
The follow-up [visible notices and artwork ledger](media-rights-ledger.md) now
provide a public credits page and per-film detail/watch notices. The manifest
remains unaccepted and unchanged.

All thirteen artwork copies match the corresponding retained parent files.
Chromium decodes them. That establishes byte identity and local usability;
all thirteen sources are now established by exact source-file or decoded-frame
comparison, with creator and extraction/crop notices. The [ledger](media-rights-ledger.md)
records Gran Dillama’s own edition card and keeps operator acceptance open; source identity
does not establish distribution approval. Sintel has no mapped backdrop.

## Offline derivatives and playback evidence

Two proposals were made directly from retained original copies, using the
qualified local application's FFmpeg. Originals and the dirty parent checkout
remain unchanged. Sintel copies the complete video stream and converts its
surround audio to stereo AAC. The [subtitle follow-up](subtitles.md) preserves
all ten original tracks as separate WebVTT files; the MKV also remains intact.
Llama Drama converts the complete original video/audio to H264/AAC. Both proposals
have MP4 fast start, retain the complete duration and closing credits, and use
new content-versioned keys recorded only in the private manifest proposal.
The complete Sintel compressed video payload also matches the original.
Adding those sidecars reuses the existing prepared MP4 without re-encoding
its picture or sound. Subtitle quality and publication remain operator checks.

Each sequential offline container used 1 CPU / 512 MiB RAM, zero additional
swap, no network, read-only input/root filesystem and a 128 PID cap. Wall guards
were 180 seconds for Sintel and 600 seconds for Llama Drama; each output had a
1.5 GiB byte guard, with 4 GiB available host RAM/free disk required. These are
offline preparation bounds, not production uploader/encoder capacity acceptance.
Sintel reached the memory cap including file cache without OOM; no spare
production encoding headroom is inferred. Exact timing/peaks/options are private.

Chromium passed local playback, audio decoding, start/middle/end seeks and
thirteen artwork loads for all seven proposals, using a loopback Range server.
Credit and final licence cards were inspected separately. This automation is
muted and does not certify audible quality, every frame or public HTTPS delivery.
Firefox 153.0 also passes the local seven-film/thirteen-artwork fixture. It uses
private compatible codec libraries copied from the existing qualified local image,
without a system installation. Chromium and Firefox additionally produce nonzero
decoded Web Audio samples with output gain zero. Safari, supported mobile,
manual listening and actual HTTPS delivery remain pending; see [acceptance](media-acceptance.md).

Public original/artwork HEAD and bounded Range probes returned the expected
types/lengths and 206 replies. Plain full GET downloads initially returned 403;
explicit complete Range reads succeeded and were checksum verified. The stale
origin in the old generated manifest failed DNS; current provider domain metadata
was read with GET only. Neither path was repaired or modified. The probe for a
synthetic Origin supplied no Access-Control-Allow-Origin; actual application
origin/CORS/caching and browser delivery must be accepted in the target setup.

The shipped manifest retains **two null playback keys**, so real import still
fails closed. Local bytes/proposed keys are ready for review, not uploaded.
After rights/key/track/browser acceptance, the operator can publish only the
accepted new objects and then the worker can commit the accepted embedded keys
and rerun image/import CI. Keep both originals. Do not reuse the public uploader
as a conversion path; Sintel exceeds its input ceiling.

## Reproduce the preparation

Use ignored private artifacts, FFprobe/Python 3.11+, local Docker and a qualified
image. Supply the public origin via a private JSON containing only `cdn_base`.
The downloader has a 2 GiB aggregate / 15 minute / 1.5 GiB per-object guard and
validates the exact complete Content-Range before retaining a copy.

```bash
python3 infra/media-review.py --local-assets "$RETAINED_LOCAL_ASSETS" \
  --origin-manifest artifacts/media-review/origin.json \
  --download-originals --download-artwork --output artifacts/media-review/originals
python3 infra/media-prepare.py "$QUALIFIED_LOCAL_IMAGE" \
  --originals artifacts/media-review/originals --output artifacts/media-review/new-proposals
node qualification/media-browser.cjs artifacts/media-review/browser-manifest.json \
  artifacts/media-review/new-browser-run "$PLAYWRIGHT_PACKAGE_DIRECTORY" firefox
```

The browser manifest contains exactly seven `entries`, each with `slug`, absolute
private `video`/`poster`/optional `backdrop` paths, probed `duration` and an
inspected `credit_time` in seconds. The runner permits only these local files,
denies external browser requests and stops after four minutes. Use an existing
pinned Playwright installation and selected Chromium/Firefox binary; record
its versions and any private codec fixture. Set `NETFILMX_FIREFOX_LIBRARIES`
only to an evidence-scoped private artifacts directory if the host codec ABI
does not match Firefox. Do not treat local desktop engines as the complete
supported browser matrix. Its JSON/screenshots remain
private. The offline proposal changes no embedded resource or application flag.

The [concrete MP4/manual acceptance procedure](media-acceptance.md) records the
stereo/subtitle/Skeleton choices and activation order for the existing bytes.

Remaining operator decisions: accept title/artwork rights and credit presentation;
review the exact Gran Dillama card; accept track/quality choices and new keys;
complete the supported browser matrix and actual HTTPS/CDN/CORS/cache playback.
See [the two-stage release plan](first-release-plan.md) for recovery, public
identity, protected delivery and the separate later upload/worker gates.
