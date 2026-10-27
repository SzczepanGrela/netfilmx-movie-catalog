# First release and operational closeout

NAB26-1, 2026-10-26: the first public launch at main `a5a0d90` is accepted.
The next candidate adds [anonymous protected playback and admin-only access](playback-protection.md).
Its separate coordinated cutover/closed rollback contract supersedes direct-public-media assumptions;
historical launch/media results below retain their date and scope. No new production change is implied.

Updated 2026-10-22 to the operator's clarified policy: interruptions during
preparation, bootstrap and migration are acceptable. Final Coolify operation
still requires rolling updates and backups of necessary data, keys and recovery
configuration. First routing does not complete that target. No numerical uptime
SLA, multi-host HA or permanent second web instance is introduced.

This plan prepares later actions. [PR #1](https://github.com/SzczepanGrela/netfilmx-movie-catalog/pull/1)
remains draft; uploads/worker stay false. Merge, GHCR publication, deployment and
provider changes need separately scoped execution instructions. The coordinator
owns private values, protection/access setup and production sequencing.

## Accepted starting point

| Evidence | Accepted scope |
| --- | --- |
| R1 at `51e1ea1d3c56fcd7903981f81fef0dc2279bdd79` | Terminal-state/uncertainty protection before rollback; [CI](https://github.com/SzczepanGrela/netfilmx-movie-catalog/actions/runs/37220691661) and [audit](https://github.com/SzczepanGrela/netfilmx-movie-catalog/actions/runs/37220691409) passed; eight added regressions, seven fail on the review base |
| PG/keyring/two-web recovery at `986e9aa` | Accepted local recovery/session/CSRF evidence with synthetic media; retain the measured limits/results in [the recovery record](catalogue-recovery.md) |
| Catalogue at `6f57dbb83ab814b3a99a2c90e9cb9652e8b138ab` | Coordinator accepted HLS publication/readback, seven active masters + ten Sintel VTT references, real CLI migration/import/repeat refusal/restart and 14 Chromium/Firefox public-media player cases |
| Exact-head catalogue checks | [CI 39086857490](https://github.com/SzczepanGrela/netfilmx-movie-catalog/actions/runs/39086857490): 304 .NET, image/scan/Quality pass; [audit 39086857541](https://github.com/SzczepanGrela/netfilmx-movie-catalog/actions/runs/39086857541) pass; Publish/Deploy skipped |
| Legacy preservation/restoration | Coordinator October 18–20 results remain history. No further legacy backup refresh, off-host transfer/retrieval or old-version restore. Existing copies, containers, media and dirty parent stay untouched |

The [embedded manifest](../NetFilmx_Storage.PostgreSql/Catalogue/retained-media.json)
is ready: seven films, one Caminandes series, three episode links and ten Sintel
tracks. The former two-derivative/licence import blocker is resolved. Preserve
the accepted 1398-object/20-variant package and source/artwork/licence/credits
references; never apply the historical two-MP4/ten-VTT patch or repeat publication.

[Final-image qualification](final-catalogue-qualification.md) used the app origin
represented privately with real public media HTTPS/CORS. Actual production app
routing/certificate/proxy belong to A. Earlier desktop/Android results retain
their scope. Sintel synchronization/cause remain unresolved; deferred Safari/
mobile/VLC/listening trials remain deferred. No new media/manual round is assigned.

## PostgreSQL 18 preparation (NP18-1)

The fresh database target now uses the [reviewed PG18 selection and storage](postgresql18.md).
CI, Compose, smoke and both qualification consumers share the 18.6-trixie digest.
A new parent volume at `/var/lib/postgresql` retains PGDATA
`/var/lib/postgresql/18/docker`; never reuse the old PG16 volume. Exact local
image, migration/import/persistence/session/restore results and CI are in the
NP18-1 restricted report/checkpoint. Earlier accepted PG16/media evidence keeps
its scope. No deployment or production rolling/restore acceptance is implied.

Coordinator's October 20 readback confirms main/production protection and both
release flags false. October 21 records an empty proposed target network;
Coolify destination registration, actual proxy peers and startup remain pending.
Read back current scoped values at execution time; do not reapply installed
protection or infer proxy addresses from a subnet.

## Three stages

| Stage | Completion | Still separate |
| --- | --- | --- |
| A — First catalogue launch (M01.3) | Protected/scoped release, one web, fresh persistent PG, new accounts/empty history, persistent keys, explicit migration/import, effective caps and public HTTPS/login/player smoke. Cutover may have downtime | Actual rolling/rollback and new-state backup/recovery acceptance in B; uploads/worker in C |
| B — Operational closeout (M01.3a) | Actual Coolify rolling and compatible image rollback, schema/shared keys, bounded overlap, scheduled protected backups of new PG/keys/configuration with proportionate recovery/failure verification | Upload/staging/encoder lifecycle in C |
| C — Upload/worker activation | Separately accepted staging, queue/retry/duplicate/source preservation, encoder handover, resource and coherent recovery contract | Both flags remain false through A and B |

## Coordinator inputs before execution

**TO SUPPLY — coordinator:** fill in and review the following private values
for the selected stage. Do not infer them from local fixtures or other apps.
Secrets use protected environment injection/storage, never CLI arguments,
public docs or report contents.

| Stage | Values/decisions to supply |
| --- | --- |
| A — Protection/access | Effective main `Quality gate` ruleset, main-only reviewed `production` environment, single-operator review policy, scoped OIDC/private API and GHCR pull access; existing credential consumers retained |
| A — Target/release | Coolify application/project/environment/destination IDs, private API URL, reviewed resource contract, actual published main digest/full SHA (`EXPECTED_REVISION` / `ACCEPTED_MAIN_SHA`), deployment reconciliation owner and maintenance/cutover instruction |
| A — PostgreSQL | Confirm [PG18 pin/parent mount/caps](postgresql18.md), new independent volume/database/network, private DDL connection, separate runtime connection and table/sequence/lock grants; no public DB port |
| A — Keys/auth | Persistent mount and absolute `DataProtection__KeyRingPath` outside `/app`; UID/GID `10001:10001`, directory `0700`; stable `JwtSettings__SecretKey`, `JwtSettings__Issuer`, `JwtSettings__Audience` and private recovery access |
| A — Ingress | `PRODUCTION_URL`, exact `AllowedHosts`, `Proxy__KnownProxies__N`, `Proxy__ForwardLimit`, app network/subnet, destination/domain/Tunnel/proxy mapping and health timings |
| A — Capacity | Effective web/PG CPU, RAM+swap, disk/free-space budgets and start/stop grace; headroom for other services/tools and any actual overlap; mount/ownership readback |
| B — Maintenance | Compatible baseline/successor digests and schemas, shared-key/session contract, rolling settings and overlap budget; reviewed private `COOLIFY_CONTRACT_JSON` and release caller/grants |
| B — Backups | New PG/keyring/required configuration coverage, protected destination/access, chosen local/off-host scope, cadence, retention/capacity, tolerable data loss/recovery time, isolated restore check and failure visibility |

Known catalogue setting: `CloudflareR2__PublicUrl=https://netfilmx-assets.grela.dev`.
Import needs that reviewed public origin and no R2 write credential. Configure
`ASPNETCORE_ENVIRONMENT=Production`, `Uploads__Enabled=false`,
`Worker__Enabled=false`, `Database__SeedDemoData=false` for web. Migration/import
use an explicitly selected `ConnectionStrings__DefaultConnection`. Do not search
for credentials or copy legacy environment values.

Coordinator preflight proposes one web **1 CPU/512 MiB + PG 1 CPU/512 MiB**,
no extra swap: 1 GiB of configured caps, plus host/service/tool headroom. These
are proposals, not installed settings or proven production capacity. Read only
current headroom and networks/target settings needed for the concrete change;
no full host or legacy backup audit. Budget any actual overlap during A. In B,
two such webs + PG would configure 1.5 GiB; confirm host headroom. Reservations
are not reserved physical RAM. Existing custom-options parser exceptions remain;
prove restrictions from effective runtime readback rather than desired JSON.

## A — Ordered first-launch instruction

These steps await a separate execution window. Missing coordinator inputs stop
the affected step; do not substitute guessed values.

### A1. Protect access and select the image

1. Read back the installed main/production protection (coordinator October 20);
   preserve current scoped settings before any separately approved change. Keep repository variables
   `PRODUCTION_DEPLOY_ENABLED=false` and `COOLIFY_RELEASE_CONTRACT_ACCEPTED=false`.
   Use the existing [delivery contract](release-delivery.md#promotion-contract).
2. After separate merge/publication authorization, main CI publishes its same
   qualified image without rebuilding. Record actual main SHA, GHCR manifest
   digest and attestations. A local image ID or PR merge-ref is not that digest.
3. Pull that digest to the agreed destination. Provision independent persistent
   PG and private keyring with reviewed permissions. Keep new web/worker stopped
   during DB preparation. Retain legacy containers/copies/route state; no further
   legacy backup/off-host/restore or obsolete-app repair.

### A2. Inspect, migrate and import explicitly

Run inside the selected published image with private environment injection.
Startup never migrates/imports automatically. No secret is a command argument.

| Order | Environment and command | Expected result | On error |
| --- | --- | --- | --- |
| 1 | `dotnet NetFilmx_Web.dll catalogue plan` (no DB credentials needed) | Exit 0; `videos=7`, `series=1`, `subtitleTracks=10`, empty `pendingPlayback`/`pendingSubtitles`; approved master keys | Stop on image/manifest mismatch; reconcile source/digest |
| 2 | Coordinator's DDL connection; `dotnet NetFilmx_Web.dll database migrate --confirm-reviewed-migrations` | Exit 0: `Reviewed database migrations applied; no HTTP server or workers started.` | Keep new web stopped; inspect DB access, schema history and migration owner before retry |
| 3 | Apply reviewed runtime grants; switch to the new runtime connection and reviewed media origin; `dotnet NetFilmx_Web.dll catalogue import --confirm-empty-database --confirm-reviewed-media` | Exit 0: `Imported 7 videos and 1 series.` | Stop on refusal/failure; inspect target/state, never clear rows or force another import |
| 4 | Coordinator/operator read-only PG verification | 7 films, 1 Caminandes series, its 3 links, 10 Sintel subtitles; exact approved URL/track mappings; no accounts/history/comments/purchases/upload intents yet | Hold startup/routing until mismatch is understood |

Initial count check in the private PostgreSQL session:

```sql
SELECT (SELECT count(*) FROM "Videos") AS videos,
       (SELECT count(*) FROM "Series") AS series,
       (SELECT count(*) FROM "VideoSeries") AS series_links,
       (SELECT count(*) FROM "VideoSubtitles") AS subtitles,
       (SELECT count(*) FROM "Users") AS users;
```

Expected before account smoke: `7 | 1 | 3 | 10 | 0`. Check actual relations/URLs
against the manifest too; counts alone do not identify mappings. `catalogue plan`
reads embedded metadata, not database contents. Import deliberately refuses a
nonempty DB without changes; do not rerun it as a health probe or repeat its
already accepted refusal test.

Do not add `--prepare-upload-queue` in A. See [migration controls](release-database.md)
for the bounded owner lock/timeouts. A failed multi-step operation can leave
earlier steps applied: read back before one reviewed retry. No automatic
downgrade, archived SQLite migration, fallback or new-DB deletion is authorized.

### A3. Bootstrap one web, switch and smoke

1. Configure the same digest, runtime values, persistent PG/keyring and caps.
   Start one initial deployment through the existing Coolify path, separately
   from the normal releaser. Record its acknowledged UUID and known terminal
   outcome; a lost/uncertain reply requires reconciliation, not resubmission.
2. Check effective image/revision, UID, mounts/permissions, flags and caps.
   Inside that web, `dotnet NetFilmx_Web.dll healthcheck` and
   `dotnet NetFilmx_Web.dll smokecheck` must exit 0. Readiness must return 200,
   `status=ready` and the exact published main revision, not `development`.
3. Perform the agreed route change; maintenance downtime is acceptable. Check
   real application HTTPS/certificate/proxy/client identity. From the reviewed
   repository checkout on the operator/probe host, run the existing public smoke
   with coordinator-supplied `PRODUCTION_URL`/`EXPECTED_REVISION` (the full published
   main SHA). This Python command runs outside the .NET runtime container:

   ```bash
   python3 - <<'PY'
   import os
   from infra.smokecheck import check_release
   check_release(os.environ["PRODUCTION_URL"], os.environ["EXPECTED_REVISION"])
   print("Public readiness/catalogue/antiforgery smoke passed.")
   PY
   ```

4. Confirm a new-account login/logout/session flow and representative catalogue,
   HLS playback, captions/Off and visible credits through the deployed route.
   This checks the new ingress/integration; no full media/download/device/
   listening round. Scripted smoke does not itself prove login or player.
5. Record digest/full revision, deployment outcome, initial counts, public smoke
   and retained current PG/keys as the first healthy candidate baseline. Keep
   release flags false until caller/contract acceptance in B. A is not B or C.

Before A3 passes there is no accepted new-image rollback baseline. On failure,
hold routing or use the agreed maintenance response; preserve new DB/keys and
deployment evidence, inspect and fix/redeploy under the scoped instruction.
Never connect an old SQLite image to new PG or discard new accounts/history.
Actual rolling, failed-release injection and restore drills are not A prerequisites.

## B — Operational closeout after launch

Reuse accepted local PG/keyring/two-web and media evidence. Check the changed
production scope through a bounded coordinator/operator action block.

- **Rolling/rollback:** retain a compatible healthy digest-pinned new-PG baseline
  and use a distinct reviewed attested successor. Confirm actual readiness,
  UUID/revision transitions, shared keys/stable JWT settings, schema compatibility,
  session/antiforgery continuity and overlap caps. Keep the old healthy web until
  replacement readiness. PG is persistent independent state, not a rolling replica.
- **State:** strict readiness rejects newer migration history. Review schema
  compatibility before migration; incompatible changes may use maintenance.
  Image rollback keeps current PG/keys/accounts/objects; it does not reverse schema.
- **Bounded recovery evidence:** accept actual Coolify rollback to that compatible
  baseline with explicit stop conditions and no competing deploy. Reuse R1
  regressions; no universal replay of the historical fault/load matrix or old-app
  recovery. Same-digest smoke only proves the no-op path.
- **New-state backups:** schedule protected new PostgreSQL, keyring (including
  expired keys) and required configuration/secrets backups. Include recoverable
  versions/digests, mounts, roles/grants, auth and proxy settings in protected
  storage; do not put secret values in reports. Choose destination/local/off-host
  coverage, access, cadence, retention/capacity and recovery objectives for this
  dataset. Persistence or a Coolify control-plane dump is not complete app backup.
  Existing whole-account R2 limits still apply if chosen; no new transfer is implied.
- **Proportionate restore:** restore a selected new-data set into isolated
  resources; check DB/schema/catalogue/account relations, keys and required
  configuration against that set. Record copy age/recovery result and useful
  backup-failure visibility. Never test by restoring over live PG. No legacy
  refresh, off-host transfer/retrieval or restore round.

After private-contract/baseline acceptance, coordinator may separately authorize
`COOLIFY_RELEASE_CONTRACT_ACCEPTED=true` while automatic promotion stays false.
Existing protected manual entry point, with full coordinator-supplied digest/SHA:

```bash
gh workflow run deploy.yml --ref main \
  -f digest="$ACCEPTED_DIGEST" \
  -f expected_revision="$ACCEPTED_MAIN_SHA"
```

Do not bootstrap through this workflow or remove the healthy-baseline condition.
After B acceptance, automation may be separately authorized with
`PRODUCTION_DEPLOY_ENABLED=true` and one observed normal protected caller using
its actual OIDC identity/approval. Manual bootstrap alone does not prove it.

## C — Later upload/worker activation

Flags remain false until a separate reviewed action. Preserve the existing
[subtitle](subtitles.md), [HLS](retained-hls.md), [keyring](data-protection.md)
and [worker/migration](release-database.md) contracts. Require shared private
staging, coherent PG/key/source recovery, durable intents/queue retries,
cancellation/duplicate/orphan cases, source retention, actual encoder handover/
forced stop, full-film/disk budgets and useful failure visibility. First-audio/
stereo stays the limitation; no multi-audio/OCR scope is added. Catalogue playback
does not establish encoder capacity.

Only in C prepare the queue with the existing command:

```bash
dotnet NetFilmx_Web.dll database migrate --confirm-reviewed-migrations --prepare-upload-queue
```

Deploy a compatible disabled image first; separately accept flags, staging/queue/
provider access and singleton ownership. Recovery includes staged sources with
DB/keys; pause scoped writers or prove coherent snapshots. Do not unlink active
worker locks or delete orphan evidence.

## Stop and reconciliation rules in every stage

| Condition | Action |
| --- | --- |
| Missing value, wrong image/manifest, unexpected schema or effective cap | Stop the affected step; coordinator resolves the exact input/state |
| Active/unknown deployment, lost queue reply, unconfirmed cancellation | Preserve R1: stop mutations, read back UUID/history/configured/running/public identity before another write |
| Known terminal failure after healthy compatible PG baseline | Normal releaser restores only saved compatible digest after termination, verifies baseline and keeps current data/keys |
| Bootstrap failure without baseline | Hold routing/maintenance, preserve failed new state and inspect/fix; no normal-releaser bypass or automatic legacy-image rollback |
| New data/key/configuration loss | Stop scoped writes; choose separately reviewed new-state recovery, preserve evidence and verify isolated recovery before switching |

Record A/B/C separately with exact source/digest/revision, settings, outcomes and
unknowns. Green CI does not imply production acceptance or cleanup authority.
UI/mobile/credits polish and repository hygiene remain separate tasks.
