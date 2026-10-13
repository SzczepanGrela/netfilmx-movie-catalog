# NetFilmx candidate status

Updated 2026-10-13 on `codex/netfilmx-preparation`, originally based on `a39d3ad6e527bcf08430d311db2c0cf0528820c3`.
Work continues in [draft PR #1](https://github.com/SzczepanGrela/netfilmx-movie-catalog/pull/1).
Production has not changed. The October 13 local recovery/source milestone is
accepted. The media/credits follow-up below remains preparation for operator review.

## Current stage: visible credits and media/browser acceptance proposal

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
its two pending playback entries. Checks cover seven videos/one series/three
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
MP4s, explains Sintel stereo/ten omitted subtitles and Llama's Skeleton omission,
and gives a per-title manual Safari/mobile/audio/credits/HTTPS checklist. No
reconversion occurred. A freshly validated private two-field manifest patch and
an unapproved publication record identify the existing bytes. Shipping playback
keys remain null; real-media import remains refused. Full hashes, measurements,
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

## First release and data/media acceptance: plan prepared

The [first-release plan](first-release-plan.md) defines protection/access setup,
seven-title provenance and derivative acceptance, isolated import/restore and
two-web qualification for the first catalogue stage. Queue/staging/encoder and
full-film capacity remain mandatory for later upload/worker activation. It separates initial Coolify
bootstrap from promotion, which still requires a healthy saved baseline, and
assigns legacy-writer backup, cutover and activation actions to the
coordinator/operator. Limits, recovery policy and media rights remain decisions
to resolve; preparation does not claim acceptance or authorize production changes.

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

Next: review the new credits/media packet and Gran Dillama’s exact BY 3.0 card; accept
stereo/subtitle choices and complete the pending native/manual/HTTPS checks.
Only operator publication and recorded acceptance can authorize a later manifest
activation/final-image real-media rehearsal. Keep PR #1 draft. R1 and the scoped
synthetic recovery/source milestone are already accepted.
Coordinator/operator must identify the target Coolify resource and review its
private contract, protected main/environment, first healthy rollback baseline
and scoped recovery plan before any production action. On 2026-10-03 the
operator declared that no NetFilmx Coolify resource exists yet; legacy SSH
deployment on the VPS may remain. Read-only GitHub API checks found `main`
unprotected, no environments/rulesets and neither activation flag configured.
October 5 readback still found main unprotected, zero rulesets/environments and
both activation flags absent. No approved deployment window has been supplied
to this implementation session.

Browser verification passed **3 DOM tests** and the locked vendor-file check.
Fresh npm install/audit reported **0 vulnerabilities**.

Live key mounts/ownership/restore, legacy writer identification and fresh scoped
data recovery remain open. The existing derivatives, visible notices and local
Chromium/Firefox checks are
prepared; operator rights/notice review, native/manual/public
playback acceptance, published keys and a real fresh-catalogue import remain open.
Uploads and worker remain disabled pending
their separate mounted staging/queue/encoder recovery, rolling, capacity and
visibility acceptance. Production budgets, backup destination/access,
cadence/retention/RPO/RTO and the coordinated legacy readback remain operator inputs.
Public cutover, cleanup and UI follow those gates. No operator production action
is requested at this implementation checkpoint.
