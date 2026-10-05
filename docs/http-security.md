# HTTP and media admission controls

These controls are implemented in the modernization candidate. They are not
evidence of a production Coolify release or a complete security assessment.

## Proxy identity

Configure `Proxy__KnownProxies__0`, `Proxy__KnownProxies__1`, etc. with the exact
trusted proxy peer IP addresses. `Proxy__ForwardLimit` defaults to 2 and accepts
1–4. Forwarded headers are processed right to left, stopping at an unknown peer.
Only `X-Forwarded-For` and `X-Forwarded-Proto` are enabled; `X-Forwarded-Host`
and direct `CF-Connecting-IP` input do not establish identity. IPv4-mapped
addresses are normalized. Do not use a Docker network CIDR, wildcard, unspecified
IP or the automatic `ASPNETCORE_FORWARDEDHEADERS_ENABLED` switch.

An empty trusted-peer list **disables forwarding**. Clearing the default trust
collections while leaving forwarding active would instead trust every peer.
This safe default groups proxied clients under the peer address until exact
production trust is configured. Before public acceptance, test the actual
ingress chain for independent clients, spoof rejection and original HTTPS.
Restrict the actual Host through deployment `AllowedHosts` and proxy routing;
ignoring forwarded Host does not validate an arbitrary original Host.

## Request budgets

Matched controller metadata selects authentication limits, avoiding path-case
or query-string bypasses. All counters are process-local fixed windows, with no
request queue. These are configurable positive values within startup bounds:

| Setting | Default | Partition |
| --- | --- | --- |
| `RateLimits__WindowSeconds` | 60 seconds | common window duration |
| `RateLimits__Login` | 10 requests/window | verified client IP + action |
| `RateLimits__Register` | 5 requests/window | verified client IP + action |
| `RateLimits__Refresh` | 30 requests/window | verified client IP + action |
| `RateLimits__Write` | 60 requests/window | authenticated user ID; otherwise verified IP |

Login and registration share a global concurrency limit of two password
operations per process, because the password hasher uses substantial memory.
Admin video creation has a global concurrency limit of one request per process.
Rejected requests return HTTP 429, JSON `rate_limit_exceeded`, `Retry-After`
and `Cache-Control: no-store`. GET/HEAD/OPTIONS reads remain available.

This is not a shared brute-force counter or an edge abuse control. Multiple
replicas and rolling replacement have independent budgets; restarts reset them.
NetFilmx needs its own runtime/edge acceptance and a reviewed replication policy.
TTT's accepted overlap exception does not automatically apply here.

## Inputs and media

- Ordinary Kestrel request bodies are limited to 1 MiB; authentication endpoints
  to 16 KiB. The explicit admin upload action retains its 1 GiB multipart/body
  ceiling and rejects a video exceeding 1,000,000,000 bytes. Form field count,
  field size and multipart header size are bounded.
- Registration validates username/email length and email format; new passwords
  are 8–128 characters. Login accepts existing shorter passwords, but caps their
  length. Registration bonus/credit behavior remains application-specific.
- Catalogue video/poster URL entry accepts only object paths at the exact
  configured HTTPS `CloudflareR2__PublicUrl` origin. Credentials, query strings,
  fragments, other ports/origins and legacy YouTube input are rejected. This
  validates reference shape; it does not prove object existence or a licence.
  Add/edit handlers retain the complete reference; the legacy YouTube-ID
  conversion is removed. Metadata editing preserves existing pending/failed
  upload state, and stale forms cannot replace a completed playback URL with
  a processing placeholder.
- Uploaded posters are limited to 5 MiB of actual bytes, JPEG/PNG/WebP signatures,
  a matching decoded codec, 4096 pixels per side and 16 million pixels. A bounded
  ffprobe/FFmpeg operation reencodes one frame into a fresh metadata-free JPEG.
  Source and output live in a random private directory (0700; files 0600), removed
  on completion/failure. A fake MIME type or signature alone is insufficient.
- Video admission checks the claimed MP4/MOV, WebM/MKV, OGV/OGG or AVI container
  signature before staging. HTML and supplied playlists are rejected. This is
  not full content validation; the bounded durable worker still probes/decodes
  the complete media. See [upload processing](upload-processing.md).

Decoder timeouts, individual allocation bounds and protocol restrictions are
not a decoder sandbox, antivirus scan or proof of aggregate resource safety.
Image/FFmpeg scanning, actual container limits, disk pressure, full-film tests,
restarts and mounted-storage/queue recovery remain release gates.

## Verification and references

Integration tests exercise spoofing, missing trust, unknown intermediate peers,
two trusted hops, user budgets, window recovery and concurrency using real ASP.NET
middleware. Real raster fixtures exercise decode/reencoding and rejection.
Authentication regressions run through real MVC forms, CSRF and cookies.

Implementation follows Microsoft's
[proxy guidance](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-8.0),
[rate limiter guidance](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit?view=aspnetcore-8.0)
and [upload guidance](https://learn.microsoft.com/en-us/aspnet/core/mvc/models/file-uploads?view=aspnetcore-8.0).
