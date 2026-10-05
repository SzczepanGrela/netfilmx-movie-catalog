# First release and data/media acceptance plan

Prepared 2026-10-05 from the coordinator's current October 4 handoff and review.
This is a proposed sequence for review. No resource, protection rule, production
data or R2 object has been changed. Uploads and workers remain disabled.

R1 is corrected at `51e1ea1d3c56fcd7903981f81fef0dc2279bdd79`:
[CI/CD](https://github.com/SzczepanGrela/netfilmx-movie-catalog/actions/runs/37220691661)
and [dependency audit](https://github.com/SzczepanGrela/netfilmx-movie-catalog/actions/runs/37220691409)
passed. Publication and deployment were skipped. The eight added release-boundary
regressions bring the Python suite to 34; seven fail on the reviewed base.
Coordinator review remains pending; [PR #1](https://github.com/SzczepanGrela/netfilmx-movie-catalog/pull/1)
stays a draft. Later media/code changes need qualification of their own SHA.

## 1. Starting facts and unresolved inputs

| Item | Evidence/status | Required action |
| --- | --- | --- |
| New data | Operator selected fresh PostgreSQL, seven retained films/episodes, new accounts and empty history | Archive legacy SQLite independently; exclude demo/YouTube rows and old user data from import |
| Coolify app | Operator reported no NetFilmx resource; legacy SSH instances may remain | Obtain fresh scoped API/host evidence before choosing a destination or creating anything |
| Repository gates | GitHub readback completed October 5: main unprotected, zero rulesets/environments, both activation variables absent | Coordinator/operator installs and reads back section 2 |
| Media | Manifest has seven entries and two null playback keys | Complete section 3 before an importable image is built |
| Stateful runtime | Code/tests implemented; production mounts, recovery and actual container overlap unaccepted | Run section 4 locally, then accept the target settings in the agreed window |
| Recovery policy | Application backup destination, retention, recovery-point and recovery-time targets unresolved | Operator records private destination/access, cadence, retention and measured restore targets |
| Capacity | Intended app/PG CPU, RAM and disk budgets unresolved | Coordinator/operator supplies proposed limits and overlap headroom before resource tests |

The worker owns app changes and evidence. The coordinator owns private topology,
platform/access configuration and review records. The operator chooses content,
recovery policy and the production window. Keep private values and full operational
evidence in restricted, ignored artifacts; public reports contain results only.

## 2. Repository, access and first-resource contract

Before merge or exposing production credentials, coordinator/operator must:

1. Activate a main ruleset: pull requests, resolved review threads, current
   `Quality gate` bound to GitHub Actions, strict up-to-date status, no deletion,
   force push or bypass actor. Record the accepted single-operator code-review
   policy explicitly; do not invent an independent reviewer.
2. Create `production`: required operator review, main-only deployments and no
   administrator bypass. The accepted single-operator policy permits self-review.
   Read back the effective ruleset and environment, including reviewer and branch
   policy; workflow YAML and a legacy protection API 404 are insufficient evidence.
3. Set `PRODUCTION_DEPLOY_ENABLED=false` and
   `COOLIFY_RELEASE_CONTRACT_ACCEPTED=false`. Leave both false during main image
   publication and bootstrap. Contract acceptance is a later reviewed action;
   automatic promotion is the final delivery gate in section 7.
4. Configure repository/environment-specific OIDC and the reviewed private
   Coolify API path. Verify the actual repository/production OIDC subject, emitted
   immutable IDs where present, tag grants and effective API access. Preserve
   other credential consumers. Coolify release access needs read/write/deploy,
   without root/read:sensitive; a team-scoped token is not app-only isolation.
   Decide whether a separate team or reviewed gateway is needed.
5. Configure `PRODUCTION_URL` and the environment secrets listed in
   [delivery](release-delivery.md#promotion-contract). Coolify needs private GHCR
   pull access scoped to packages read. Store credentials privately; keep builds
   in CI and deploy the qualified image by digest.
6. Review the initial resource contract: Docker-image build pack, GHCR repository,
   immutable tag, HTTP 8080, no host port binding, readiness command, destination,
   domains/network/proxy aliases, health timing, restart/stop grace, retention and
   CPU/RAM budgets. Compare the supported API fields and read back actual mounts,
   flags, networks, process identity and effective limits separately.

The runtime is UID/GID `10001:10001`. Provision a dedicated persistent keyring
outside `/app`, owned by that identity, directory mode `0700`, key files private.
Every overlapping instance must mount the same directory read/write at the same
configured path, with application discriminator `NetFilmx.Web`. Keep JWT secrets
separate and stable. Provision staging separately only for its later acceptance;
local filesystem locks require a single host and the same shared mount.

Use a separate PostgreSQL database/role, no public DB port, reviewed major version
and persistent storage. Separate administrative DDL credentials from the runtime
role and test the runtime's required grants. Do not connect the new app to the
legacy SQLite directory. Record exact trusted proxy peers and `AllowedHosts`;
do not use broad network trust. Synthetic smoke limits do not define the budget.
The existing custom-options parser exception remains; certify restrictions only
from effective runtime evidence.

## 3. Media provenance, derivatives and import rehearsal

### Seven required records

Use the [embedded manifest](../NetFilmx_Storage.PostgreSql/Catalogue/retained-media.json)
as the proposed mapping, with [catalogue details](retained-catalogue.md).

| Title | Original R2 key | Current playback proposal |
| --- | --- | --- |
| Sintel | `videos/sintel.mkv` | Missing derivative |
| Tears of Steel | `videos/tears-of-steel.mp4` | Same object, unaccepted |
| Charge | `videos/charge.webm` | Same object, unaccepted |
| Elephants Dream | `videos/elephants-dream.mp4` | Same object, unaccepted |
| Caminandes: Llama Drama | `videos/caminandes-llama-drama.ogv` | Missing derivative |
| Caminandes: Gran Dillama | `videos/caminandes-gran-dillama.mp4` | Same object, unaccepted |
| Caminandes: Llamigos | `videos/caminandes-llamigos.webm` | Same object, unaccepted |

For each title, record the original/playback/poster/backdrop identity, size,
content type, content checksum and object version/ETag if available. An ETag is
not necessarily a content checksum. Verify duration, codecs/tracks, opening and
closing credits against the authoritative edition. Local MP4 filenames and
public reachability do not establish identity or distribution rights.

Collect title-specific primary evidence for licence/version, distributor,
required attribution, modification notices and any exceptions for music,
artwork/posters or marks. Operator accepts each proposed public use and catalogue
presentation. Publish required notices/credits before public acceptance; retain
full film credits. Missing evidence holds that entry and the complete import.

Prepare the Sintel and Llama Drama derivatives offline from verified originals.
Prefer a reviewed browser-compatible MP4 with H264/yuv420p, AAC and fast start,
or a reviewed HLS variant. Record encoder/version/options, selected tracks,
duration/frame checks and credits; document omitted tracks. Use new versioned
keys, preserving all original objects. Existing local MP4s are candidates until
identity and credit preservation pass. Do not send a full-length source through
the public uploader as a conversion shortcut; its 1 GB input ceiling applies.

**Operator actions:** approve content and new keys; upload only the two accepted
derivatives with scoped R2 write access, preserving originals. Provider metadata,
CORS or delivery changes, if necessary, belong to the operator. The worker may
prepare bytes and a manifest patch without provider writes. Never grant bucket
delete access for this work. Commit accepted playback keys and rerun image CI;
the manifest is embedded, so editing a running container is insufficient.

### Playback acceptance

For every playback object and poster/backdrop, collect dated results through the
actual HTTPS media origin. Require correct MIME, bounded byte-range requests
returning 206 with matching `Content-Range`, appropriate caching/CORS, no mixed
content and working artwork. Test playback, sound, seeks near the start/middle/end
and complete credits in Chromium, Firefox and Safari, including the supported
mobile path. Same-key WebM/MP4 entries also need these checks; add further
derivatives if the supported browser matrix requires them. Record unsupported
browsers as an unresolved product decision, not a pass.

### Isolated PostgreSQL rehearsal

Use a disposable empty database and the exact qualified image containing the
accepted manifest. Keep its web and workers stopped. Supply credentials through
private environment injection; commands inside the image are:

```bash
dotnet NetFilmx_Web.dll catalogue plan
dotnet NetFilmx_Web.dll database migrate --confirm-reviewed-migrations
dotnet NetFilmx_Web.dll catalogue import --confirm-empty-database --confirm-reviewed-media
```

The importer needs `ConnectionStrings__DefaultConnection` and the reviewed
`CloudflareR2__PublicUrl`, with no R2 API key. Require seven videos, one Caminandes
series, exactly its three episode links, expected metadata/URLs, generated IDs
and zero accounts/history/comments/purchases. Verify sequence health and all
artwork/playback mappings. Repeat import must refuse without changing rows.
An incomplete manifest, nonempty database or pending schema must refuse import;
retain the existing regressions and add meaningful cases if the manifest changes.
Then start the isolated web app with private keys and verify catalogue behavior.

## 4. Local stateful and resource qualification

Prepare a scoped Docker harness using the exact candidate image, disposable PG,
private persistent keyring/staging mounts and isolated storage transport. Initially
use mock R2; label that evidence accurately. Real provider transfer acceptance
later requires operator-approved test keys/access. Never use production state.

Before running, record proposed CPU/RAM/stop-grace limits for **both** app
containers and PG, free disk/reserved headroom, fixture size/duration, per-case
watchdog and stop thresholds. Start with a short bounded synthetic fixture;
record its hash and encoder settings. Full-film/resource tests form a separate
upload-activation gate. Unknown limits must be resolved before claiming acceptance.

| Exercise | Required evidence |
| --- | --- |
| PG recovery | Consistent dump restored into a separate DB; migrations/counts/relations, runtime grants and application probes pass; record copy age and elapsed restore time |
| Keyring recovery | Protected backup restored with ownership/modes; an existing MVC form cookie/token survives container recreation, two containers and isolated restoration; expired keys retained |
| Mount identity | Effective old/new mounts refer to the same host directories; keyring/staged source survives recreation; independent rings/staging paths fail the relevant sharing checks |
| Durable intent/queue | Source flush precedes committed intent; queue loss/reconnection and enqueue-before-job-ID crash recover; duplicate delivery publishes once and preserves current admin edits |
| Retry/failure | Conversion/transfer errors retain the exact source identity; three configured retries and exhausted-job recovery are observed; missing source fails without fabricated playback |
| Actual two-container handover | Two worker-enabled containers share staging/PG; one server/dispatcher and encoder owns work; orderly stop and forced owner termination transfer ownership without concurrent encoders |
| Phase interruption | Restart/forced stop during staging, encode, transfer and result commit; committed intent/source recovers, partial/unreferenced files or objects are inventoried and retained |
| Capacity and disk pressure | Per-container/aggregate CPU, peak memory, process count, source/work/output/orphan bytes and free disk measured; no OOM or unrelated-service interference; bounded disk-pressure case preserves recoverable state |

Prepare the queue explicitly with
`database migrate --confirm-reviewed-migrations --prepare-upload-queue` before
enabling the local harness. Use the actual production retry/lease semantics;
record any test-only acceleration. Do not unlink lock files. Record image SHA/ID,
limits, fixture, timestamps, jobs/intents, owner transfer and recovery results.
The existing two-host service test and upload-disabled image smoke remain code
evidence, not two-container rolling acceptance.

Backup coherence spans PG, keyring and staged inputs. For a recovery set with
enabled uploads, pause the scoped writers/worker or prove an application-consistent
snapshot procedure; a PG dump alone cannot restore missing sources. Restore into
new isolated resources, check the pending-job/source mapping and retain orphan
evidence. Keep keys/configuration private and separate from the DB archive.

## 5. Coordinated production window: preserve legacy and prepare target

Only after coordinator review and local evidence, schedule the operator window.
Its private action block must name target resources, budgets, recovery package,
stop conditions and rollback owner. Verify current provider recovery and working
administrative access for the scoped change; unrelated deferred platform recovery
work is not silently reopened.

1. Obtain a fresh selective legacy inventory: both reported instances, running
   image IDs/revisions, mounts, process IDs, actual SQLite files/journals and
   writer handles. Inspect writable-layer state as well. Do not print raw
   environment, labels, command lines, user rows or credentials. A short private
   readback block is supplied in the worker's ignored report.
2. Identify every writer before copying or stopping anything. Use SQLite's online
   backup API for each confirmed DB, or pause **all identified writers** for a
   consistent file set, preserving WAL/SHM/journal state as appropriate. A raw
   live DB copy is insufficient. Coordinate mutable adjacent files separately;
   an online DB backup does not snapshot them.
3. Save retained data/assets, exact legacy image archives and configuration/key
   recovery material privately with timestamps, permissions and inventory.
   Produce the agreed off-host copy and restore it in isolation. Require SQLite
   `quick_check`, record relation/count checks and pre-existing anomalies. Record
   backup age and restore time; source backup and Coolify DB backup are separate.
4. Retain both legacy instances/data until ownership and retention are accepted.
   Restore any scoped writers stopped for backup on failure. Preserve the old
   route state; no NPM reactivation or shared proxy restart is part of this plan.
5. Create the independently reviewed Coolify/PG/keyring resource with uploads,
   worker and demo seeding explicitly false. Read back storage/permissions,
   trusted peers, effective limits and private recovery destinations. Leave the
   resource stopped until its published image and offline data preparation are
   ready. Leave the public cutover unperformed.

## 6. Publish and bootstrap the initial healthy baseline

After R1, media/import and the relevant recovery reviews, coordinator/operator
may approve protected merge. With both activation flags false, main CI publishes
the **same qualified image** and provenance/SBOM. Record actual main SHA, manifest
digest and attestation verification; PR merge-ref qualification is not a published
main digest. Qualify further changes rather than reusing R1's earlier CI claim.

Bootstrap is an explicit operator action, separate from `infra.coolify_release`:

1. Pull the published attested digest on the new destination. With the new web
   and worker stopped, run the reviewed migration and empty-catalogue import from
   that image against the separate PG database; validate section 3 counts.
2. Configure the reviewed digest, persistent keyring and production-safe runtime
   values. Start one initial Coolify deployment and retain its acknowledged UUID.
   Track it to a known terminal state; uncertain replies/status stop mutations
   and require readback, without blindly submitting another deployment.
3. Verify the initial resource internally: effective image/mounts/UID/limits,
   live/readiness, exact full revision, catalogue/assets and stable data after
   recreation. No HTTP/workers should have run before migration/import.
4. If internal acceptance passes, operator provides the separately reviewed HTTPS
   test ingress without replacing the retained public route. Accept representative
   external smoke, media and proxy behavior. Record the saved digest, OCI/public
   revision agreement and health evidence as the first rollback baseline.

Until step 4 passes there is **no accepted new-image rollback baseline**.
Bootstrap failure leaves legacy state retained; terminate/reconcile only the new
scoped candidate, preserve new DB/keys for diagnosis and review any retry. A
legacy SQLite image must never be connected to the new PG database. Normal
promotion keeps its existing healthy-baseline requirement.

## 7. Delivery acceptance, public cutover and later upload activation

Once bootstrap and private contract are accepted, coordinator/operator can set
`COOLIFY_RELEASE_CONTRACT_ACCEPTED=true`, keeping automatic promotion false.
Record effective contract/mount/access readback before exercising protected
manual deployment on main:

```bash
gh workflow run deploy.yml --ref main \
  -f digest="$ACCEPTED_DIGEST" \
  -f expected_revision="$ACCEPTED_MAIN_SHA"
```

Supply the reviewed full `sha256:...` digest and 40-character main SHA in those
two variables. This is a template for the future window, not an action already
performed. Same-digest smoke verifies connectivity
and the no-op path only. Actual rolling/rollback acceptance needs a distinct
reviewed attested successor and a retained compatible healthy baseline.

Require dated evidence for: an isolated unhealthy-candidate exercise with the old
service retained and failing UUID terminated; protected positive release; controlled
failed public smoke restoring the prior digest/revision and complete stable
behavior; two-run serialization; and measured old/new CPU/RAM/disk overlap. Fault
fixtures, candidate-only failure injection and stop conditions need their own
bounded operator-reviewed block. Do not load/failure-test the VPS implicitly.

Accept actual ingress: local/proxy/public health, exact client/HTTPS identity,
forwarded-header spoof rejection, independent origin rejection, auth/write/body
limits, antiforgery/session behavior and all seven playback/range/poster/credit
records. Review the temporary multiplication/reset of process-local counters
during overlap as a NetFilmx-specific policy. Other apps' exceptions do not apply.
Keep wider unresolved edge/platform controls assigned with explicit status.

After recovery and public acceptance, operator performs the reviewed cutover,
checks the full expected revision and representative new-account flow, and
observes the service for the agreed interval. Preserve old state/routes for the
agreed recovery period. To enable automatic promotion, first accept the delivery
gates, then set `PRODUCTION_DEPLOY_ENABLED=true` and observe one controlled
Quality → protected Deploy caller with its actual OIDC identity and approval.
Record this final caller test separately from manual dispatch.

Uploads/worker remain false through the first catalogue cutover. Activation needs
section 4, representative full-film/disk results, target mount/queue/provider
recovery and rolling acceptance, orphan-retention policy and operational
visibility. First deploy a disabled compatible image; only enable flags under
its separately reviewed action. Warnings, i18n and useful worker/release/backup
visibility remain tracked; broader UI modernization follows these gates.

## 8. Stop and recovery decisions

| Condition | Action |
| --- | --- |
| Active/unknown deployment, lost queue reply, runner loss or unknown cancellation | Stop mutations; read back acknowledged UUID/history, configured/running/public identity and data compatibility; coordinator/operator reconciles before one chosen recovery action |
| Known terminal failure after accepted PG baseline | Restore only the saved compatible digest, retaining current PG, keys, staging and objects; confirm terminal recovery UUID and full baseline smoke |
| Bootstrap failure before baseline acceptance | Preserve legacy and failed new state; no automatic legacy-image rollback into PG or competing deploy |
| Data/source/key loss or incompatible schema/jobs | Disable scoped writes/workers; preserve affected state; restore to new isolated resources from the reviewed coherent recovery set, verify and switch only under a separate accepted recovery action |
| Licence/identity, capacity or restore evidence missing | Hold the corresponding import/cutover/upload gate; report exactly what remains unknown |

Completion evidence is a private dated acceptance record plus public-safe status:
exact source/digest/revision, settings and mounts, data/media counts, measured
resources/recovery, deployment UUID outcomes, retained recovery state and open
gates. Production acceptance and cleanup cannot be inferred from green CI.
