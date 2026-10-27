# Local final-image catalogue qualification

NAB26-1, 2026-10-26: the first public launch at main `a5a0d90` is accepted.
The next candidate adds [anonymous protected playback and admin-only access](playback-protection.md).
Its separate coordinated cutover/closed rollback contract supersedes direct-public-media assumptions;
historical launch/media results below retain their date and scope. No new production change is implied.

The October 18 operator authorization permits the accepted seventeen-reference
manifest activation and local qualification. Publication/readback and NHP17-1
are accepted prerequisites. No upload, encoding, full HTTP inventory download,
provider configuration, GHCR publication or application deployment belongs here.

## Inputs and image identity

Use the unchanged `artifacts/hls/20261017-catalogue/publication-proposal/` packet,
record SHA-256 `bd89e9a34cf0ff6a0268608356fa45be7eed08ecfc4a92faaa5a810755c1ee88`.
Its proposed manifest SHA-256 is
`e0ca16e65878eaf8bc647dc215ca8a3cc2c9eeba37c8883da0b73d7aa3b84327`.
Activation changes seven playback and ten subtitle keys only. Retain sources,
artwork, prices, series membership, licences and credits. Never apply the older
two-MP4/ten-VTT patch.

Commit all qualification inputs, then build once from that explicit full SHA:

```bash
docker build --provenance=false --file infra/Dockerfile \
  --build-arg RELEASE_REVISION=<full-source-SHA> \
  --tag netfilmx:final-<full-source-SHA> .
python3 qualification/final_catalogue.py \
  netfilmx:final-<full-source-SHA> <full-source-SHA> \
  artifacts/hls/20261017-catalogue/publication-proposal \
  artifacts/hls/<new-run-directory> <local-playwright-package-directory> \
  --app-origin <approved-HTTPS-app-origin> \
  --media-origin <approved-HTTPS-media-origin> \
  --record-sha256 bd89e9a34cf0ff6a0268608356fa45be7eed08ecfc4a92faaa5a810755c1ee88
```

The harness requires a clean checkout at the supplied image SHA and local Unix
Docker socket. It records the immutable local image ID and revision label.
It reuses the recovery harness, [current pinned PostgreSQL 18 selection](postgresql18.md) and helper linked to
byte-identical candidate storage/import libraries. The candidate image itself
runs the explicit migration and real embedded-manifest CLI import. There is no
synthetic replacement of catalogue URLs or pricing. Assert seven films, one
series, three episode links, ten subtitle relations, all original mappings and
empty accounts/history. A repeated real CLI import must refuse without changes.
Restart PostgreSQL and web, then compare IDs, metadata and subtitle relations.
The regular image smoke also imports the shipping manifest and checks repeat
refusal/restart; its media origin is synthetic and it makes no media request.

## Real origin, TLS and browser scope

Only the owned TLS gateway binds `127.0.0.1:443`. PostgreSQL and web remain on
an internal Docker network without published ports. The gateway forwards to the
candidate web using ordinary trusted-proxy headers. These describe the actual
local proxy hop and never change a media request.

`browser_namespace.py` starts each browser in a private mount namespace with
the app hostname mapped to loopback in a private hosts file. All other names,
including the media hostname, use real DNS. Host `/etc/hosts`, trust stores and
provider configuration remain untouched. A short-lived qualification CA signs
the app-host certificate. Only disposable NSS/profile stores trust that CA.
TLS validation stays enabled; there is no request interception, response
replacement, forged Origin header or disabled web security. The browser emits
the real HTTPS application origin to the real public media endpoint.

Chromium and Firefox use the actual MVC page and Vidstack, test all seven HLS
masters, decoded dimensions for every quality, Auto, seeks, natural ending,
replay, all ten actual Sintel captions and Off. Record actual media responses,
CORS headers and failed/cancelled fetches. Expected speculative cancellations
on seek/switch are recorded separately; HTTP failures and CORS errors fail.
Firefox uses the previously qualified private codec-library directory.

Prerequisites: Docker, OpenSSL, NSS `certutil`, Bubblewrap, Node/Playwright and
the existing local browser/codec installations. One run owns its resources,
uses bounded CPU/RAM and an 1800-second deadline; its monitor retains the
recovery harness's disk/RAM headroom guards. Cleanup removes only owned
containers/volumes/networks and temporary synthetic secrets; evidence and images stay.

This qualifies local image/catalogue/browser integration with published media,
not public application routing, production proxy/limits, cutover or native
Safari/mobile. Earlier manual observations retain their scope. Audible quality,
deferred device trials and Sintel's unresolved synchronization are not promoted
to passes. No offsets are changed. Uploads/worker stay false and PR #1 stays draft.

NP18-1 changes the shared database fixture; the accepted `6f57dbb` run used PG16.
Its media/browser evidence is retained, without rerunning it for this database task.
