# Media acceptance and pending manifest activation

Updated October 17, 2026. The operator now requests adaptive HLS for the entire
seven-film catalogue. [The HLS contract](retained-hls.md) supersedes the former
two-MP4/ten-VTT publication plan; retain that packet, both MP4s and all prior
observations as history. No publication or manifest activation is authorized.
First audio/stereo and the unresolved Sintel synchronization observation remain
explicit. Earlier manual results apply to their tested artifacts and scope.

## Historical two-MP4 proposals

These prepared MP4s are preserved for evidence/comparison. They are superseded
as target catalogue playback by HLS from the retained originals. The following
records their original transformation and listening questions.

| Proposal | What is retained / changed | Decision required |
| --- | --- | --- |
| Sintel | Complete original H.264 video is copied, with matching compressed payload; no trimming. AC-3 5.1 becomes AAC stereo. Complete credits and duration remain. All ten original subtitle tracks are preserved as separate WebVTT files | Review the existing stereo mix and picture, plus text, timing and labels of all ten sidecars in the player |
| Llama Drama | Complete Theora video becomes H.264/yuv420p; Vorbis stereo becomes AAC stereo. Ogg Skeleton data is omitted. Complete credits and duration remain | Accept the converted picture, audible sound and source-card readability. Skeleton is container metadata rather than a subtitle or extra film scene |

AAC stereo was selected for a common browser/mobile playback path. Sintel's
downmix trades discrete surround channels for that compatibility; it does not
improve the source and cannot replace listening for clear dialogue, balanced
music/effects, distortion or sync. Llama Drama was already stereo, so no surround
mix is lost. Both outputs put MP4 metadata before media data for fast start.

The preserved Sintel languages are German, English, Spanish, French, Italian,
Dutch, Polish, Portuguese, Russian and Vietnamese. Persistent catalogue mapping
supplies WebVTT tracks to the actual Vidstack player, with language selection and
Off. Caption extraction reuses the prepared MP4 without changing video/audio.
Local synthetic MP4/HLS checks in Chromium and Firefox cover selection and seeking;
review of these real sidecars, native devices and target HTTPS remains open.

Confirm the Llama Drama source's `fishead` signature and selected video/audio
against the private probe: Skeleton describes Ogg stream mapping/timing. Its
omission does not certify audible quality, but it does not omit a subtitle track.
The [Xiph Skeleton specification](https://xiph.org/ogg/doc/skeleton.html) explains
its container role. The proposal's selected video/audio and complete credits
are preserved independently of this data stream.

The private timing follow-up also explains Llama Drama's shorter MP4 video
stream: the source ends with zero-byte Theora repeat packets after its final
distinct image. The [Theora decoder contract](https://theora.org/doc/libtheora-1.2/theoradec_8h.html)
identifies these as duplicate frames. The MP4 retains that final image while its
audio continues to the container end; a new local Chromium/Firefox check seeks
into this tail and reaches normal playback completion. This is local evidence,
not a substitute for the manual sync/complete-ending check below.

Sintel exceeds the public uploader ceiling. Any later accepted publication is
an operator-owned offline operation, with exact length/hash verification and new
keys. It must not go through the public uploader or replace an original.

Reconversion requires a recorded failure/decision: rejected downmix, visible
encoding artefact, unsupported codec/profile or a chosen alternative format.
Caption sidecars alone do not require video reconversion. No such reconversion
was performed in this assignment.

## Local automated evidence

The extended runner checks seven local files and thirteen artwork images in
Firefox, using the same bounded loopback Range fixture. It records its engine,
Playwright/browser versions, codec capabilities, frame counters, seeks, per-title
failure states and nonzero decoded Web Audio samples. Output gain is zero:
this demonstrates audio decoding, not human listening. Public-origin requests
remain denied. Browser launches and the optional private Linux codec libraries
are recorded in restricted evidence; the host OS was not modified.

The actual MVC credits page was also checked at 375, 768 and 1440 CSS pixels in
PL/EN: seven notices/thirteen artwork entries, no horizontal overflow, readable
contrast and visible keyboard focus. An existing CSS override that exposed the
mobile menu over the credits was fixed; open/close behavior and its expanded
state were checked. This desktop-engine viewport check does not qualify a real
mobile device's playback.

Chromium's earlier local pass remains accepted. The common runner's new audio
measurement is separately checked on Chromium. These are native desktop engines
in a local Linux fixture, not native Safari/iOS or the app's real HTTPS delivery.
Unavailable checks stay pending. [Playwright's browser guidance](https://playwright.dev/docs/browsers)
also distinguishes its patched engines and platform-specific media support.

## Historical manual checklist and retained deferrals

The operator reduced further detailed manual tests on October 17. Keep the
already reported desktop/Android results; do not request another Safari/VLC,
exact device-version or full listening round. Unperformed trials below remain
pending/deferred. The new HLS stage uses automatic Chromium/Firefox tests and
does not claim full human synchronization/translation acceptance.

The following is the earlier checklist, retained as history rather than a new
request to the operator. Actual dated results are in the restricted acceptance
packet; the pending template below does not erase recorded desktop/Android results.
Missing trials remain deferred, never passed.

| Film | Native Safari desktop | Native supported mobile | Audible sound | Full closing credits / notices | Actual HTTPS playback |
| --- | --- | --- | --- | --- | --- |
| Sintel | pending | pending | pending | pending; all ten sidecars prepared | pending |
| Tears of Steel | pending | pending | pending | pending | pending |
| Charge | pending | pending | pending | pending | pending |
| Elephants Dream | pending | pending | pending | pending | pending |
| Llama Drama | pending | pending | pending | pending | pending |
| Gran Dillama | pending | pending | pending | pending; own edition card established | pending |
| Llamigos | pending | pending | pending | pending | pending |

For each title, record date, exact browser/OS/device, tested artifact identity and:

1. Start with a user gesture; picture, sound, pause/resume and fullscreen work.
   Test the chosen mobile orientation/background-resume behavior on a real device.
2. Seek near start, middle, end and the private credit timestamps. Listen on the
   selected speaker/headphone path for clear dialogue/music/effects and sync;
   watch the complete ending. Sintel needs explicit surround-to-stereo review.
3. Read the whole credit scroll and the site's film/artwork notices at desktop
   and mobile widths. Confirm licence/source links, crop notices and full poster
   credit strips. Gran Dillama’s notice must use the retained edition’s BY 3.0 card.
4. Through actual HTTPS, use normal playback and explicit bounded Range probes:
   correct MIME, 206 and matching Content-Range/length, start/middle/end seeks,
   all thirteen images, no mixed content, expected cache behavior. Record browser
   errors and the request Origin plus relevant CORS headers. Cross-origin plain
   media playback and JavaScript/crossorigin-enabled access have different CORS
   needs; test the actual player's requests rather than inventing a blanket rule.

Native Safari desktop and Safari on a real supported iPhone/iPad remain deferred.
Chromium device emulation and Linux WebKit do not complete native Safari/mobile acceptance.
The read-only original-object probes are dated partial evidence; their failed
whole GET and synthetic-Origin result cannot be converted into delivery approval.

## Activate the prepared manifest only after publication

The replacement HLS proposal and unified patch change seven playback fields
and ten subtitle object keys. The shipping manifest remains unchanged with
two playback/ten subtitle nulls, so import still refuses incomplete media.
No runtime proposal override or new import bypass was added.

1. Record the content/publication disposition using the current HLS packet and
   known manual limitations. Operator publishes the seven accepted HLS trees
   and ten WebVTT sidecars, leaving originals intact. Record exact identity,
   MIME/Range/cache and actual-origin readback. Rights for all seven films and
   thirteen graphics must be resolved; publication does not itself establish them.
2. Executor verifies that the seventeen-field patch matches the accepted/publication
   record and current manifest; commits the exact accepted keys. If an operator
   chooses another artifact, regenerate the proposal rather than applying stale
   keys. No activation is authorized by this preparation step.
3. Requalify the final-image real-media import, seven videos/one series/three
   links, empty initial accounts/history, URLs/artwork and playback. Keep that
   result separate from the already accepted synthetic recovery rehearsal.

Repository protection, production capacity/recovery and cutover stay with the
coordinator. This document adds no new platform assignment. Uploads and worker
remain disabled; PR #1 remains draft.
