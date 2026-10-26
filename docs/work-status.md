# NetFilmx candidate status

Updated 2026-10-26 on `codex/netfilmx-preparation`, originally based on `a39d3ad6e527bcf08430d311db2c0cf0528820c3`.
Work continues in [draft PR #1](https://github.com/SzczepanGrela/netfilmx-movie-catalog/pull/1).
The application has not been deployed; the retained HLS media were published
through the separately authorized one-time tool. Accepted R1, recovery/source reconciliation, credits,
subtitle code at `f4aca03` and earlier desktop/Android observations are preserved.

## Current stage: NAB26-1 anonymous protected playback candidate

Base is merged main `a5a0d90a332cc47931b5aff924f817ab6366918c`; PR #1 is merged.
New work uses `feature/playback-protection` in a clean worktree; the old dirty
parent and candidate/evidence are retained. The October 24 first public launch
is accepted in its dated scope. This new protection has not been deployed.

Implemented: anonymous catalogue/watch, withdrawn public signup/wallet UI,
retained data/schema, guarded operator admin CLI, admin-only login/refresh with
Managed Turnstile and current-role checks; separate 30-minute RSA film/version
grants; private read-only R2 Worker with authentication before every cache lookup,
canonical shared byte cache, MIME/CORS/HEAD/conditional/Range and abuse limits.
Player renewal retains position, manual/Auto quality and language/Off. The
[release contract](playback-protection.md) lists exact configuration/secret
consumers, allowlist generation, key rotation and coordinated closed cutover.

Local source checks include backend rejection/session/admin regressions, 80
Python tests, cross-runtime .NET/Worker vectors and 22 Worker tests including
real workerd Cache/R2. A bounded actual MVC/Vidstack fixture passed Chromium
151 and Firefox 153 with synthetic 16-second/two-quality HLS, ten sidecars,
expiry/retry, seek/end, Auto/Off and admin creation/login/refresh/logout on local
PG18. Widget/Siteverify are test-assembly simulations, not live bot acceptance.
Native URI transport is tested separately; Safari/iOS remains untested.
The warm-HEAD Node CPU proxy measured about 0.18 ms/request; production
Cloudflare 10 ms CPU and shared 100000/day availability are not accepted by that.
CI/exact tested source and image are recorded in this PR and the restricted
NAB26-1 report/checkpoint; final review links follow qualification.

No app/Worker publication, deploy, provider configuration, media rewrite or
original-film retest. Uploads/worker and deployment activation flags remain false.
Sintel synchronization and prior manual/device deferrals are unchanged. Stage B
rolling/new-state backups and stage C uploads remain separate. Coordinator must
review the exact draft head and supply the actual widget/domain/binding/keys/
limits and protected rollback or closed maintenance sequence before production.

## Historical PostgreSQL 18 preparation and accepted release stages

### PostgreSQL 18 preparation (NP18-1)

The October 20 release plan at `052f439` was accepted by the coordinator.
[PG18 selection and procedure](postgresql18.md) now align CI, fresh developer
Compose storage, image smoke and existing recovery/final-catalogue consumers.
The focused DB mode checks real-manifest CLI import/repeat refusal, runtime
DDL/history denial, same-volume PG recreation, two-web sessions/antiforgery and
one small PG18 restore using the retained keyring. Exact committed local-image,
PG/server versions, effective mounts/caps/settings, measured results and CI are
recorded in the restricted NP18-1 report/checkpoint. Dependencies and migrations
are unchanged; this stage does not repeat media qualification or recover legacy.
Coordinator October 20 protection readback is installed; both release flags are
false. Target destination/proxy/resource values and PG startup remain separate.

### Accepted release documentation and A/B/C policy

The operator accepts interruptions during preparation, bootstrap and migration.
The updated [first-release plan](first-release-plan.md) and
[delivery instructions](release-delivery.md) separate:

- **A — First launch:** protected/scoped release, one web, fresh persistent PG,
  new accounts/empty history, persistent keys, explicit migration/import, caps
  and public HTTPS/login/player smoke. Cutover may have downtime.
- **B — Operational closeout:** actual rolling/compatible rollback, shared schema/
  keys, overlap headroom and scheduled protected backups of **new** PG/keyring/
  required configuration with proportionate restore/failure verification.
- **C — Upload/worker:** separate staging/queue/source/encoder recovery and capacity
  acceptance. Both flags remain false through A/B.

Further legacy backup refresh, off-host transfer/retrieval and old-version restore
are withdrawn; preserve their historical results, copies and containers. A does
not require the whole production rolling/rollback/restore drill before routing,
and first routing does not complete B. Coordinator supplies the missing target,
credentials, limits, ingress and new-backup policy values listed in the plan.
R1 and the normal releaser's healthy-baseline requirement remain intact;
bootstrap uses the existing separate operator step. No new deploy/recovery code.

This is documentation only. Code, manifest, accepted local image, media/evidence
and dirty parent stay preserved; PR draft, no merge/GHCR/deploy/provider writes,
UI or repository cleanup. Required PR CI is checked for the documentation commit;
no local media, encoding, transfer or deferred manual round is repeated.

## Accepted catalogue activation and local image — October 18

NHP17-1 was accepted at `82f6a7966fced2ff746a6cd33bc8e410ceb0ac5e`.
The coordinator accepted activation and local final-image qualification at
`6f57dbb83ab814b3a99a2c90e9cb9652e8b138ab`: seven approved HLS masters,
ten Sintel VTT references, real PG import/repeat refusal/restart and 14 actual
Chromium/Firefox MVC/Vidstack public-media cases. No blocking finding remains.
[CI 39086857490](https://github.com/SzczepanGrela/netfilmx-movie-catalog/actions/runs/39086857490)
passed 304 .NET/image/scan/Quality; [audit 39086857541](https://github.com/SzczepanGrela/netfilmx-movie-catalog/actions/runs/39086857541)
passed, Publish/Deploy skipped. The shipping manifest now
matches the immutable publication proposal byte for byte; sources, artwork,
prices, licences and credits are preserved. The former two-MP4/ten-VTT patch
remains historical and unused.

The [final-image procedure](final-catalogue-qualification.md) uses the committed
candidate image, real PostgreSQL CLI migration/import and restart, then actual
MVC/Vidstack against the public media endpoint with the real application origin
represented locally. It retains normal TLS/CORS and records image identity,
catalogue/subtitle mappings and browser evidence. Actual run results and CI
links and coordinator acceptance are recorded in the restricted report/checkpoint.
This does not qualify the production app's routing/certificate/proxy or imply
deployment. No publication/encoding/full HTTP inventory is repeated.
PR remains draft, uploads/worker false, no merge/GHCR/deploy/provider change.
Sintel synchronization and deferred manual trials retain their earlier status.

## Historical milestones and their original evidence scope

The dated sections below retain earlier results and then-open questions. Their
pending publication/import/manual wording describes those checkpoints; the
October 18 acceptance and current A/B/C plan above define today's status.

### Accepted NHP17-1 HTTP client identification

The coordinator accepted publication of the unchanged 1398-object packet at
`8c7b8d5`, retention of all existing objects and the complete HTTPS readback
with an identified client. Original package metadata and both the failed default
HTTP result and successful historical adapter result remain preserved.

The [publication verifier](hls-publication-tool.md) now sends the fixed honest
`NetFilmxPublicationVerifier/1.0` identity for GET/HEAD/Range/OPTIONS and records
`httpUserAgent` in new HTTP results. Hash/length/MIME/cache/Range/CORS/TLS checks,
no redirects and stop-on-403 behavior remain. Focused regressions use fake S3
and loopback HTTP; public readback is limited to one segment, VTT and master.

This correction repeats no transfer, encoding, full-catalogue HTTP or manual
media acceptance. The earlier preparation sections below retain their historical
scope. The separate October 18 activation/local qualification authorization is
described above. PR stays draft, uploads/worker false; no merge/deploy
or provider configuration change is part of NHP17-1.

## Accepted seven-film HLS preparation

The operator expanded the media scope to adaptive HLS for all seven retained
originals. The [HLS technical contract](retained-hls.md) describes the shared
upload/offline encoder, source-bounded proportional ladders, exact publication
packet and separate delivery/activation gates. All ten Sintel WebVTTs retain
their accepted bytes, labels and times; there is no sync compensation.

Prepared payload: **20 quality variants, 1398 objects, 1083549423 bytes**. The
complete graph/segment/source-identity verification passes for seven films.
The private actual-player runner checks Chromium/Firefox quality choices with
decoded dimensions, Auto, seeks, natural endings and all ten languages/Off.
Its results, diagnostic attempts, exact commits and current CI are recorded in
the private checkpoint/report, separately from the older accepted tests.

Concrete failures found during this stage have narrow corrections: Theora's
final repeat image is held to its measured source duration, unspecified Theora
SAR defaults to square, HLS metadata preload waits for the hls.js provider
so Vidstack populates the quality menu, and quality changes retain the playing
fragment with bounded prefetch to avoid a Chromium flush/seek race. Llama alone was re-encoded for its
measured ending/aspect failures; six passing encodes were preserved.

At preparation time the **inactive seventeen-field proposal** changed seven master keys and ten
subtitle keys. The older two-MP4/ten-VTT packet remains historical and must not
be activated. At that stage shipping manifest, originals, old MP4s, both checkouts and accepted
R1 remain preserved. No provider write, deployment or merge occurred; uploads
and worker remain false and PR #1 remains draft.

At that checkpoint, next was packet review and an operator publication decision, actual
HTTPS/CORS readback, then separately authorized manifest activation and final
image migration/import/restart/real-HLS qualification, now accepted above. Detailed manual trials
remain deferred under the operator's reduced scope. Sintel's perceived sync
cause/full acceptance is unresolved. UI/mobile/credits polish and repository
hygiene belong to separate later work owned by the coordinator.

## Accepted subtitle preservation and player support

The accepted media follow-up is `9601fd1c5fbde30114484f22cc470ba15581cc17`.
The new [subtitle implementation](subtitles.md) preserves all ten Sintel tracks
as WebVTT without re-encoding its prepared MP4. Explicit PostgreSQL/SQLite
migrations persist ordered language/label/URL links, including catalogue import.
Actual locally served Vidstack supports language selection and Off for MP4/HLS;
films without subtitle links retain playback. A missing sidecar produces a message.

New uploads extract supported text subtitles before adaptive H.264/AAC HLS work.
Unsupported/damaged tracks fail visibly and retain the staged source. All files
must finish before readiness and links commit together; retries, cancellation and
duplicate delivery are covered. First-audio/stereo remains an explicit limitation.

The current local Chromium/Firefox player checks cover multiple languages,
UTF-8 text/timing, Off, seeking, keyboard selection, real decoded frames, adaptive
HLS and missing-sidecar recovery. Backend tests exercise actual FFmpeg and
persistence/restart. The local full suite passed 294 tests with no failures/skips,
including disposable PostgreSQL. CI links are in PR Checks and the private
checkpoint. Native Safari/mobile, listening and target HTTPS/CORS stay open.

At the October 15 milestone, the shipped manifest required ten sidecars but retained null keys, alongside
the two pending playback keys. An inactive twelve-field publication proposal
supersedes the earlier two-field packet. Nothing has been published or activated;
uploads/worker stay off, both checkouts/originals and accepted R1 stay preserved.

## Accepted earlier milestones

Coordinator accepted R1 October 12 and the local recovery/source milestone
October 13 at `35e32d78f38622571dd086a905ed67a0468f7ca0`. This follow-up adds
visible credits, artwork provenance and Firefox evidence; PR #1 stays draft.
No VPS action, R2 write, deployment,
merge or production activation occurred. Cloudflare domain metadata and retained
public media were read only. Private documentation/roadmap and the divergent dirty
parent checkout are preserved.

[Catalogue recovery](catalogue-recovery.md) passed against local image/source
`986e9aa947a58f18a405fbb59a3fec05df2bad30`: two actual webs, disposable persistent
PG and shared/restored private keys, uploads/worker off. The importer uses an
explicitly synthetic completed plan; the real embedded manifest still refuses
its two pending playback entries at that source SHA. Checks cover seven videos/one series/three
links/generated IDs, empty history, repeat/account refusal, runtime grants and
DDL denial, real HTTPS session/MVC antiforgery across peers/recreation/restore,
wrong-keyring rejection and restored refresh revocation after logout.

Each web/PG used 1 CPU / 512 MiB RAM, with total RAM+swap 512 MiB;
cgroup readback verifies CPU quota and zero additional swap. PG data uses a
monitored 512 MiB stop budget, not a hard filesystem quota. Eight-minute wall
and 4 GiB host available-memory/free-disk guards remained in force. Final local
run: **96.634 seconds total; dump-to-restored DB/keys/counts 13.487 seconds**.
Peak web memory was **441.76 MiB**, PG **146.59 MiB**, gateway **34.36 MiB**;
PG disk **54.87 MiB**. Source PG stops before restored PG starts. These peaks
include cache/startup and do not qualify production load or encoding capacity.
Scoped resources and synthetic secrets were removed; images/results retained.

[Media review](media-review.md): the [artwork ledger](media-rights-ledger.md)
now identifies all thirteen sources: four exact source publications and nine
pixel-identical frame extractions. Required author/licence/crop notices are
visible at `/Home/Credits`, linked in the footer, and on matching film detail/watch
pages. Gran Dillama's retained-edition licence is now established by its own
brief card at 02:24.5: CC BY 3.0, Blender Foundation / www.caminandes.org. The
retained MP4 matches the official archive member byte-for-byte. Earlier isolated
samples missed that card; a final-26-second contact sheet and full-resolution
capture provide the missing primary evidence. The current Studio BY 4.0 copy
has different video/audio payloads and is not used as the archive's licence.
No catalogue object or manifest entry was replaced. Operator acceptance of
notices, source/licence evidence and marks remains open.

Local Firefox 153.0 passes seven films/thirteen images, using a versioned private
codec fixture from the already-qualified local image; no OS libraries were
installed. The common runner adds nonzero decoded audio samples with output gain
zero, also checked on Chromium. A focused final-tail check explains Llama Drama's
Theora repeat frames and confirms the held image until normal MP4 completion.
These checks do not establish human listening, native Safari/mobile or real HTTPS
media delivery. The credits page passes local PL/EN checks at 375/768/1440 pixels,
including keyboard focus and menu open/close; the mobile CSS overlap is corrected.
Seven new .NET credits/identity/rendering tests pass locally. Final-head CI is
recorded in PR Checks and the restricted checkpoint; existing warnings remain.

The [acceptance proposal](media-acceptance.md) reuses the two existing offline
MP4s, explains Sintel stereo and Llama's Skeleton omission,
and gives a per-title manual Safari/mobile/audio/credits/HTTPS checklist. No
reconversion occurred. The former two-field packet is superseded by the subtitle
proposal above. Shipping playback and subtitle keys remain null; real-media import
remains refused. Full hashes, measurements,
proposed keys and private evidence remain in ignored artifacts.

The coordinator accepted the preserved-source comparison: 77 expanded paths,
51 identical, 25 intentionally developed further, one shared deletion, no omitted
feature. The parent was not copied, reset, cleaned or stashed again. Previously
accepted R1 and PostgreSQL/keyring/two-web recovery were not repeated.

Earlier local harness attempts exposed fixture ingress, host-filter and CookieJar
attribute-case issues, corrected without changing app security or resource limits.
An initial browser fixture timeout was also corrected. The final passing reports
and failed attempts remain in the ignored private checkpoint/report.

CI compiles the external recovery helper against its exact qualified image and
checks the local entry points. The full six-core local recovery/media exercise
is reproduced separately; ordinary PR CI does not pretend to run that scope.
The pushed final-head run is recorded in PR Checks and the private checkpoint;
publication and deployment must remain skipped.

## Release review R1: accepted October 12

Review base: `cbf2ec16cac64d2dfe4d85b8b575f4eacdd69578`. Candidate and
rollback errors after queueing now require a confirmed terminal UUID or stop
mutations with `UncertainDeployment`. Unknown statuses are classified before
the public-probe threshold; HTTP protocol failures are normalized without
printing response content. An active candidate must finish bounded cancellation
before restoring the saved digest. Missing queue confirmation and uncertain
rollback outcomes cannot start another release or become ordinary failures.

**34 Python tests pass**, including eight new complete `deploy_release`
regressions: malformed health transport with active/unconfirmed cancellation,
unknown status at the third failed probe, confirmed cancellation ordering,
unexpected monitor/queue errors, unknown cancellation state, finished-candidate
smoke rollback and uncertain rollback polling. Seven of those eight regressions
failed on the reviewed base; the terminal smoke rollback control already passed.
Existing successful/known-failed release tests still pass. These are offline
fake-client/transport tests; no Coolify or production endpoint was contacted.
At corrective SHA `51e1ea1d3c56fcd7903981f81fef0dc2279bdd79`,
[CI/CD 37220691661](https://github.com/SzczepanGrela/netfilmx-movie-catalog/actions/runs/37220691661)
and [dependency audit 37220691409](https://github.com/SzczepanGrela/netfilmx-movie-catalog/actions/runs/37220691409)
passed, including image qualification and `Quality gate`. Publication and
deployment were skipped. Coordinator accepted this correction October 12;
keep PR #1 a draft.

## First-release plan: current A/B/C split

The [first-release plan](first-release-plan.md) reuses accepted media and local
recovery evidence. A covers fresh-PG bootstrap/public smoke with allowable
downtime. B closes actual rolling/rollback/overlap and new-data backups/restore;
C later covers queue/staging/encoder/source recovery and full-film capacity.
Normal promotion still requires a healthy compatible baseline; bootstrap is
separate. Coordinator supplies actual resource/access/limits/ingress values and
the new-state backup policy. No further legacy backup/off-host/restore is required.
This documentation authorizes no production action.

## Durable Data Protection: implemented and locally tested

The [key-ring contract](data-protection.md) requires private persistent storage,
stable application/cookie names and startup validation before HTTP/workers.
Keys remain separate from JWT/password configuration. There is no at-rest XML
encryptor; filesystem controls and protected backup/restore still matter.

Local Release suite: **256 passed, 0 failed, 0 skipped**, including isolated
PostgreSQL, SQLite and synthetic FFmpeg processing. Fifteen added key-ring cases cover
MVC antiforgery after restart, two live hosts, rotation/expired-key retention,
ring/application isolation and invalid storage. Locked NuGet restore/audit passed.
Existing compiler/nullability warnings remain. The local .NET 10 runtime image
for `e2b5f7fa2f4ad40fa432dbc7a0622fccc85b71e2` passed disposable smoke. The
same PR head also passed GitHub application/image qualification below.

## Migrations/readiness/worker ownership: implemented and locally tested

The [explicit release operation](release-database.md) prepares application and
optional Hangfire schemas under a bounded single-owner lock. Web startup checks
schema readiness without migrating. Runtime queue storage cannot install its
schema. Both uploads and worker activation are explicit; shared server ownership
prevents two Hangfire servers/dispatchers during local rolling overlap.

Twelve added release cases cover failed/nonmutating startup, repeat migration,
PostgreSQL/SQLite races, failed/cancelled DDL, schema-version rejection, health
dependency loss and ownership transfer between two real Hangfire servers. The
key-ring suite also demonstrates isolated restoration of existing form tokens.

## .NET 10 and delivery: implemented, local and PR CI qualification passed

All five projects/tooling and pinned Docker bases use .NET 10. Locked audited
NuGet restore and the full **256-test** Release suite pass. The
[delivery candidate](release-delivery.md) builds/tests one image, publishes its
immutable digest with provenance/SBOM after the quality gate, and gates Coolify
promotion on private settings plus protected main/production. Old SSH deploy
and diagnosis paths are retired in this candidate. No GHCR digest is published
by local testing; production promotion remains disabled.

Thirty-four Python regressions cover scoped rollback, active-release conflict,
uncertain mutations/status, bounded API/public replies, private-contract drift,
revision/catalogue and antiforgery smoke. Workflow validation with actionlint
passed. Local image qualification covers native H264 tooling and restart on
isolated private keys/PostgreSQL; it does not establish public or VPS acceptance.

At head `e2b5f7fa2f4ad40fa432dbc7a0622fccc85b71e2`,
[CI/CD run 37143896496](https://github.com/SzczepanGrela/netfilmx-movie-catalog/actions/runs/37143896496)
passed .NET 10 tests/audits, exact-image smoke, fixable HIGH/CRITICAL vulnerability
gate, SBOM generation and `Quality gate`.
[Dependency audit 37143896364](https://github.com/SzczepanGrela/netfilmx-movie-catalog/actions/runs/37143896364)
also passed NuGet and browser audits. Publication and deployment were skipped.
PR CI builds the merge ref; local qualification uses the branch SHA. Main
publication/promotion/attestation and live rollback have not run. The R1 section
above records the newer corrective SHA and CI. Subsequent plan-only commit
checks remain available in PR Checks.

## Remaining gates and next step

Next execution belongs to coordinator/operator under a separate stage A action:
current protection/access/target readback, qualified main digest, independent PG/
keyring, explicit migration/import, one web with caps, allowable cutover downtime
and public smoke. October 18 coordinator readback still found unprotected main,
no environments/rulesets and absent activation flags; read back before setup.
No execution window is authorized by this documentation assignment.

Browser verification passed **3 DOM tests** and the locked vendor-file check.
Fresh npm install/audit reported **0 vulnerabilities**.

HLS publication, rights/credits evidence, 17 references and local final-image
import/player acceptance are complete at 6f57dbb. Actual production app integration
remains A; final rolling/rollback/schema/key compatibility and scheduled backups
of new PG/keys/configuration with proportionate restore/failure visibility remain
B. Production limits, target/runtime/ingress values and new-state backup policy
are coordinator inputs. No additional old-app backup/off-host/restore or full
media/manual round is assigned. Sintel stays unresolved; deferred trials stay
deferred. Uploads/worker remain false until C. UI and cleanup remain separate.
