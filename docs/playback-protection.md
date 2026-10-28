# Anonymous playback and private media gateway (NAB26-1)

Implementation contract, updated 2026-10-29 for background verification. This
document describes required configuration; it does not certify live provider
acceptance. Catalogue, film details, artwork and credits
remain anonymous. Public signup and the pretend wallet/purchase UI are withdrawn.
Stored users/history, media and database schema remain intact. Administrator
access uses the existing sessions/CSRF plus Turnstile on login. This release
requires the provider widget to use Invisible mode. Uploads
and the application's transcoding worker remain disabled. The **media Worker**
is a separate Cloudflare HTTP gateway, not that transcoding worker.

## Backend and player contract

- `POST /playback/grant`: form `videoId` and `token`, `X-CSRF-TOKEN` header and
  same-origin antiforgery cookie. No viewer account. Maximum body 4096 B, form
  value 2048 characters, four form fields. Film authority comes from the stored
  approved playback key, never a supplied prefix, filename, price or role.
- Invisible widget action `netfilmx-playback`; admin login action
  `netfilmx-admin-login`. The backend uses the fixed Siteverify HTTPS endpoint,
  validates success, exact configured hostname/action and challenge time (five
  minutes; at most 30 s future skew). Tokens are globally single-use at Siteverify;
  no successful verification is cached or replayed locally. One attempt, three
  seconds, bounded 16 KiB reply, normal TLS, no redirects. Failure issues no grant.
  Known Cloudflare test credentials are rejected. Tests inject a provider handler
  only in the test assembly; the production application has no endpoint override.
- A separate RSA 2048–4096-bit key signs RS256 JWS with exact header
  `alg=RS256`, `typ=nfx-playback+jwt`, `kid`, and claims
  `iss,aud,film,ver,iat,nbf,exp,jti`. Lifetime is 1800 s, `nbf=iat`, token ID is
  a fresh UUID without separators. Worker enforces types, algorithm/key ID,
  issuer/audience, film/version, maximum lifetime and 30 s future skew; expiry
  is strict, with no post-expiry grace. Admin JWT/Turnstile secrets are not keys
  for this protocol. No header key URL or client-selected storage authority.
- Reply: `url`, `subtitles` (key/language/label/scoped URL), `expiresAt` and
  `catalogueVersion`, all `no-store`. URLs use
  `/g/<grant>/<film>/<full-object-key>`. Relative HLS playlist/segment references
  retain this prefix; all ten Sintel VTTs receive it independently. Static
  manifests and catalogue responses contain no grant. Object bytes are unchanged.
- Opening a watch page starts Invisible Turnstile automatically in the background.
  Script loading waits for `turnstile.ready`, with an eight-second SDK deadline
  and a 30-second overall verification deadline. No separate verification prompt
  or checkbox is shown. The normal Play action records intent while loading;
  access preparation alone never starts audio/video playback.
- Grant expiry starts one fresh background attempt, preserving time, manual/Auto
  quality, language/Off and paused state. Provider/network failure stops and shows
  a plain playback error with explicit retry; no automatic failure-retry loop.
  Vidstack waits for `can-play`; renewal recreates the provider so Auto stays
  usable. Browser autoplay restrictions may still require its normal Play action,
  using the existing valid grant rather than issuing another challenge.
- Diagnostics expose only `data-error-phase`, a bounded `data-error-code`
  (SDK/challenge, CSRF, grant, media) and, when supplied, Cloudflare's six-digit
  `data-provider-code` on the player wrapper. Retired callbacks cannot change it.
  No token, response body or grant-bearing URL is logged. Error text stays about
  playback and the next action. The existing privacy page links Cloudflare's
  Turnstile Privacy Addendum; changing widget mode is a coordinator provider step.
- Each verification attempt owns a fresh widget and its callbacks. Once a token
  is handed to activation, the widget is removed and its callbacks are retired.
  Late success/error/timeout/expiry events cannot affect an issued grant or a
  later attempt. A failure of the active verification still permits explicit
  retry. Widget-token expiry and the film grant's expiry are separate lifetimes;
  only actual grant expiry invokes playback renewal.

This is access control and abuse resistance. It does not prevent an authorized
viewer copying already downloaded media, or revoke previously downloaded public
bytes. No DRM, content offsets or conversion changes were added.

## Read-only Worker and cache

Production entry: `media-worker/src/index.js`; locked local tooling and tests in
`media-worker/`. `catalogue.json` is shared with the .NET embedded resource. It
binds the unchanged shipping manifest and approved publication-record hashes:
**7 films, 1398 protected objects / 1083549423 B, ten VTTs, thirteen public artwork
keys**. Version is a canonical SHA-256 of the compiled metadata.

Regeneration uses only the accepted record (no media/network reads):

```bash
python3 qualification/generate_media_allowlist.py \
  --publication-record "$ACCEPTED_PUBLICATION_RECORD" --check
```

Omit `--check` only when deliberately regenerating the same reviewed metadata.
CI checks version, shipping-manifest identity, sizes, counts and film boundaries
without requiring the ignored source packet. An upload/new film needs a separately
reviewed allowlist/version policy; it is not automatically admitted by the DB.

The Worker permits GET/HEAD/OPTIONS, strict canonical known paths and no query.
It rejects unknown keys, originals, alternate encodings, cross-film grants and
writes. Direct bare playback URLs and the internal cache-key path are denied.
Only the thirteen exact artwork keys are public. There is no bucket listing,
public-origin fallback or arbitrary fetch proxy; the source only calls R2 head/get.

Authentication and abuse checks precede every protected cache/R2 access,
including conditional requests, HEAD, Range and preflight. Cache keys are
`/<internal-prefix>/<catalogue-version>/<object-key>`, independent of grants,
viewers and request parameters. Only full successful 200 objects are inserted,
streamed without buffering a whole movie. Internal TTL is 86400 s; protected
client policy is `private, no-store`; public artwork is `public, max-age=3600`.
Only the explicit Cache API controls protected bytes. It is local to a data
centre; this is not a promise of globally shared hit rates.

MIME comes from the reviewed allowlist; R2 length/ETag are checked before serving.
Full/HEAD, strong ETag, If-None-Match/If-Modified-Since, If-Range and single byte
ranges (closed/open/suffix) are handled. Multi-ranges/invalid ranges are rejected;
HEAD ignores Range. If-Match/If-Unmodified-Since are explicitly unsupported (400).
A 206 is never inserted as a full cache object. Conditional/range cache hits are
still authorized. Exact app-origin CORS includes readable denial responses and
exposed length/range/ETag headers; it is not authorization. No cookie credentials
or wildcard origin. Errors and quota exhaustion remain closed.

### Starting abuse limits and Free-plan evidence

| Layer | Default / scope |
| --- | --- |
| Grant POST | 30 per client IP / 60 s / app process, zero queue; four concurrent verifications |
| Admin login | Existing ten per IP / 60 s and two concurrent password operations |
| Refresh | Existing thirty per IP / 60 s |
| Worker `GRANT_LIMIT` | 180 per signed token ID / 60 s / Cloudflare location |
| Worker `REQUEST_LIMIT` | 1200 per connecting IP / 60 s / Cloudflare location, including artwork |

Normal catalogue segments are six seconds: about ten segment requests/minute for
one selected quality, plus playlists, startup buffer, seeks and selected VTTs.
The 180 limit gives room for those bursts; the higher IP allowance accommodates
shared-IP viewers. Local short-fixture tests deliberately use two-second segments,
quality switching, seeks and renewal in Chromium/Firefox. This is bounded evidence,
not a production load or shared-IP capacity guarantee. App overlap can double its
process-local allowance. Worker counters are location-local/eventually consistent,
not a global exact quota. There is no Redis, Durable Object, cost alert or spending
cutoff in this change.

Workers Free currently shares **100000 requests/day and 10 ms CPU/request** across
the account. Denials, artwork and cache hits still invoke the Worker. At one
six-second segment per request, 600 segment requests/hour already implies at most
about 167 viewer-hours/day before all other traffic; it is not reserved capacity.
A bot can exhaust availability. Never reopen public R2 or fall back to an origin.
Local Node/V8 measurement of 1000 authorized warm HEADs with real RSA verification
is approximately 0.2 ms process CPU/request, zero R2 calls. Actual workerd Cache/R2
semantics are tested separately. Node process CPU is a proxy, not Cloudflare
billable CPU; real Free-plan CPU/quota acceptance remains an operator check.

## Configuration and secret consumers

No private values belong in Git or reports. Existing PostgreSQL, keyring, proxy,
JWT and false deployment flags retain their current contract.

`Playback__Enabled=false` stops issuing new grants. It does not revoke an already
issued grant: that remains valid until expiry or removal of its verification key
in the Worker. A closed-maintenance/revocation plan must preserve this distinction.

| Exact name | Consumer / meaning |
| --- | --- |
| `Turnstile__SiteKey` | Public widget key in admin login and playback UI; Managed widget |
| `Turnstile__SecretKey` | Backend Siteverify only; private secret |
| `Turnstile__ExpectedHostname` | Backend exact hostname, without scheme/port/path |
| `Playback__Enabled` | Default false: closed playback maintenance; true only after cutover acceptance |
| `Playback__GatewayUrl` | Backend bare HTTPS media Worker origin |
| `Playback__Issuer`, `Playback__Audience` | Backend explicit stable grant namespace, each at most 256 characters |
| `Playback__KeyId` | Backend active RSA key ID, 1–64 ASCII letters/digits/underscore/hyphen |
| `Playback__SigningKeyPath` | Backend absolute private RSA PEM file, 2048–4096 bits, at most 16 KiB; owner-only permissions; mount read-only outside `/app` |
| `AdminProvisioning__Username`, `AdminProvisioning__Email` | Operator CLI identity only, no password value in env/args/logs |
| `APP_ORIGIN` | Worker exact app origin including scheme/port, no trailing slash |
| `GRANT_ISSUER`, `GRANT_AUDIENCE` | Worker values exactly matching backend issuer/audience |
| `GRANT_PUBLIC_KEYS` | Worker public RSA JWKS JSON, one or two keys; `kty,alg=RS256,use=sig,kid,n,e`; no private components |
| `MEDIA` | Worker binding to the existing private catalogue bucket; no S3 credentials needed |
| `REQUEST_LIMIT`, `GRANT_LIMIT` | Worker rate-limit bindings with unused account namespace IDs chosen by coordinator |

`media-worker/wrangler.example.jsonc` is intentionally incomplete and contains
no actual bucket/domain/account/namespace IDs or secret. `workers_dev` and preview
URLs are false; observability is disabled to avoid request-path grant logging.
Compatibility date 2026-07-30 matches the pinned local workerd engine. Complete
only a private copy outside Git. Build `npm --prefix media-worker ci --ignore-scripts`
and `npm --prefix media-worker run build`; this publishes nothing.

App/Worker responses use `Referrer-Policy: no-referrer`. Application logging must
exclude response bodies/grants. Worker code logs no request URL or grant; before
cutover disable or redact any provider request/tail/Logpush/analytics forwarding
that would retain `/g/<grant>/...`. Share watch-page links, never media grants.
Local browser evidence redacts grants and deletes ephemeral private signing/TLS keys.

### Guarded administrator provisioning

First establish operator access, before withdrawing signup in production. Use
only the reviewed image, intended current PG/runtime DML connection and private
input. Command exits before HTTP, Data Protection and workers; it never migrates,
seeds or promotes an existing identity. Username/email collision stops without
changing that account. Password must be 12–128 characters, supplied on redirected
stdin; no default, password argument or secret output.

```bash
# Private env supplies the reviewed connection and chosen admin identity.
# Password file is outside Git, private, and retained/removed under operator policy.
docker run --rm --interactive --network "$REVIEWED_PRIVATE_NETWORK" \
  --env-file "$PRIVATE_ADMIN_ENV" "$REVIEWED_IMAGE" \
  admin create --confirm-operator-access --confirm-create-admin \
  < "$PRIVATE_ADMIN_PASSWORD_FILE"
```

Expected: exit 0, `Administrator created. No HTTP server or workers started.`
On failure/uncertain acknowledgement inspect the intended DB/identity before
retrying. Never clear users or change an ordinary account's role to make this
command pass. Confirm the operator can log in and reach an authorized admin route
before coordinator withdraws signup. After cutover, validate the new real Managed
challenge/admin flow; keep operator-local recovery access if configuration fails.
Ordinary credentials cannot obtain a remaining login/refresh session, and admin
JWTs are checked against the stored admin role so role withdrawal takes effect.
Public `/auth/register` is absent; user/history tables remain unchanged.

### Signing-key rotation

Generate/store a separate RSA private key with owner-only access and expose only
its public JWK to the Worker. Do not reuse JWT, Turnstile or Data Protection keys.
Deploy verification keys `[old,new]` first, then switch backend path/key ID after
readback. Each issuer loads its private key once per process; replace/restart all
reviewed issuer instances to change the key. Overwriting a mounted PEM does not
hot-reload it. Once every issuer instance has stopped using old, retain old verification
for at least 1830 seconds and reconcile overlap before removing it. Removing a key
revokes its grants even with warm cache. In compromise, close issuance/remove the
key and require fresh challenges; do not restore a public media fallback.

## Coordinated release and rollback (not executed)

Coordinator must provide one concrete reviewed window and actual values before
any provider/app change. Keep normal deployment flags, uploads and worker false.

1. Review exact app/Worker commits, CI, generated list and protected/closed
   rollback plan. Establish the admin with the guarded CLI and verify operator
   access before withdrawing signup. Preserve current DB/keys/media/configuration.
2. Prepare private Managed widget, host/action contract, independent RSA/JWKS,
   read-only R2 binding, exact CORS and dedicated rate namespaces. No production
   dummy keys. Save relevant old settings; refresh scoped domain/bucket exposure.
3. Reuse the existing media hostname where practical so stored references/artwork
   remain valid. It is currently attached to R2: it cannot simultaneously be a
   Worker Custom Domain. Coordinator must review the supported detach/attach/DNS
   sequence. A **closed maintenance interval is allowed**. Disable all direct R2
   public routes/aliases and retain disabled r2.dev; do not delete objects.
4. Attach the reviewed Worker domain/configuration with no public-origin fallback
   or outer cache capable of serving protected bytes before validation. Confirm
   bare masters/segments/VTT/originals deny even warm; artwork remains public.
5. Bootstrap the qualified app under the reviewed protection contract. Keep
   `Playback__Enabled=false` until settings/admin/private gateway are confirmed,
   then enable in the scoped operator sequence. Verify real widget host/action,
   admin login/refresh/logout, anonymous representative HLS/captions and cache
   negatives. This bounded new route acceptance is not another seven-film/device
   listening programme. Native Safari/iOS and previous deferrals stay pending.
6. Record effective settings, image/Worker versions, real CPU/requests and closed
   failure behavior. Only then accept a compatible protected healthy baseline
   for normal releases. R1 uncertainty handling and its baseline precondition stay.

The old direct-public-media app alone is **not a protected rollback**. Keep the
new Worker/R2 privacy boundary and keys when reverting to a compatible protected
revision. If no such baseline exists, close playback (or the public app route
through coordinator's existing maintenance mechanism) while repairing; never
reopen R2/signup as a shortcut. Unknown write/deployment outcomes stop for
reconciliation. No automatic provider rollback or new deployment mechanism is added.
Final rolling/compatible rollback/new-state backups remain their separate stage B;
uploads/transcoding remain stage C.

## Reproduction and evidence scope

```bash
NETFILMX_GRANT_VECTORS="$PWD/artifacts/playback/grant-vectors.json" \
  dotnet test "ST2 NetFilmx.sln" -c Release
NETFILMX_GRANT_VECTORS="$PWD/artifacts/playback/grant-vectors.json" \
  npm --prefix media-worker test
dotnet build qualification/PlaybackProtection/PlaybackProtection.csproj -c Release
node media-worker/node_modules/playwright/cli.js install --with-deps chromium firefox
mkdir -p artifacts/playback
node qualification/playback_browser.mjs artifacts/playback/new-browser-run
```

Only the browser installer installs local dependencies; do not run it on a VPS.
The browser fixture owns a loopback PG18 container (1 CPU/512 MiB/no extra swap),
actual MVC/Kestrel and HTTPS workerd with synthetic 16-second HLS/two qualities,
ten synthetic captions and artwork. It uses the production PG importer and admin
CLI/runtime role. Widget/Siteverify are explicit test-assembly simulations, not
production test keys or a delivery bypass. Local test certificate trust exceptions
are scoped to fixture browsers; ordinary CORS is active and media responses are
not intercepted. It checks admin and anonymous viewing, quality/Auto, seek/end,
expiry/retry state and captions/Off. Native transport follows the actual signed
playlist graph and ten sidecars by HTTPS; native Safari/iOS decoding is untested.

CI retains exact-image migration/import/admin/readiness/restart qualification,
plus the new bounded Chromium/Firefox fixture and Worker cross-runtime/spies/real
Cache API. The image recovery harness checks guarded admin provisioning and
closed-provider form/refresh denial; authenticated flows live in the provider
fixture, without adding a production Siteverify bypass. Historical PG/media
qualification remains dated evidence; this assignment repeats no real movie round.

Primary references: [Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/),
[rate limits](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/),
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/).
