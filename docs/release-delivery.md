# Immutable image delivery candidate

NAB26-1, 2026-10-26: the first public launch at main `a5a0d90` is accepted.
The next candidate adds [anonymous protected playback and admin-only access](playback-protection.md).
Its separate coordinated cutover/closed rollback contract supersedes direct-public-media assumptions;
historical launch/media results below retain their date and scope. No new production change is implied.

Updated 2026-10-22 under the operator's clarified policy. Preparation, bootstrap
and migration may interrupt service. Final Coolify operation still requires
readiness-gated rolling releases and backups of necessary new data/keys/configuration.
No numerical uptime SLA or HA is introduced. [PR #1](https://github.com/SzczepanGrela/netfilmx-movie-catalog/pull/1)
stays draft; this documentation update performs no merge, publication or deployment.

Coordinator's October 18 readback found missing protections; October 20
readback confirms main/production protection and both flags explicitly false.
Refresh relevant readback before execution and supply remaining private
target/access values as listed in
[the first-release plan](first-release-plan.md#coordinator-inputs-before-execution).

## Three delivery stages

| Stage | Operator outcome |
| --- | --- |
| A — First catalogue launch | One web, fresh persistent PG, new accounts/empty history, persistent keys, explicit migration/import, effective caps and actual public HTTPS/login/player smoke. Cutover may have downtime; bootstrap is separate from the normal releaser |
| B — Operational closeout | Actual rolling/compatible rollback, shared keys/schema and bounded overlap, scheduled protected backups of new PG/keyring/required configuration with proportionate isolated restore and failure verification |
| C — Upload/worker activation | Separate staging/queue/source/encoder lifecycle, recovery and capacity acceptance; flags remain false through A/B |

First routing completes A only. The ordered commands, expected results and stop
actions are in [the existing release plan](first-release-plan.md#a--ordered-first-launch-instruction).
No further backup refresh/off-host/restore of old NetFilmx is required. Preserve
legacy copies, containers, media and accepted historical results.

The fresh database target is now [PostgreSQL 18.6 with pinned storage/configuration](postgresql18.md).
NP18-1 qualifies the database change locally without another film/browser round;
previous PG16/media evidence is historical. Coolify startup awaits coordinator review.

## Build and qualify once

- Five projects, SDK/tooling and ASP.NET/EF dependencies use .NET 10. The SDK is
  pinned in `global.json`; Docker SDK/runtime tags also have manifest digests.
- CI performs audited locked NuGet/npm restores, .NET tests against disposable
  PostgreSQL/SQLite, DOM/vendor checks and Python release regressions.
- The container job builds one image with the full source SHA in both OCI
  metadata and assembly metadata. `/health/ready` returns that revision.
- `infra/image-smoke.sh` uses isolated disposable resources, no host port and
  synthetic credentials. It verifies explicit migrations, UID/GID `10001`,
  private persistent keys, catalogue/assets, FFmpeg/ffprobe and restart.
- Trivy rejects fixable HIGH/CRITICAL findings and produces an SPDX SBOM.
  Unfixed findings remain visible; the gate is not a claim of no vulnerabilities.
- PR jobs have read-only tokens. Main publication loads the qualified image
  artifact, pushes it without rebuilding, records its GHCR manifest digest,
  and attaches GitHub provenance and SBOM attestations. The quality gate
  requires both application and container jobs to pass.

Local image IDs, source SHAs and published manifest digests are different.
No GHCR digest can be reported for local-only qualification.

## Promotion contract

The new workflows replace main-push SSH builds/deployments. Legacy launchers
fail closed; the ad-hoc SSH diagnosis workflow is removed. They neither learn
host keys nor prune shared Docker resources. Credential retirement still
requires a consumer inventory; deleting a script does not revoke credentials.

Automatic promotion requires repository variables `PRODUCTION_DEPLOY_ENABLED`
and `COOLIFY_RELEASE_CONTRACT_ACCEPTED` to equal `true`. Manual dispatch also
requires the accepted-contract flag. Neither flag is configured by this patch.
Only `main` may run preflight. Before enabling either entry point, configure
and read back main protection requiring `Quality gate` and a `production`
environment restricted to main with required operator review and no administrator
bypass. Follow the agreed single-operator review policy.
Workflow YAML alone does not prove those remote protections exist.

Production uses environment variable `PRODUCTION_URL` and environment secrets
`COOLIFY_URL`, `COOLIFY_APPLICATION_UUID`, `COOLIFY_TOKEN`, `TS_CLIENT_ID`,
`TS_AUDIENCE`, `COOLIFY_CONTRACT_JSON`. Source private API/resource identifiers
from secrets so runner environment logs mask them. Keep values out of public
docs, source, command logs and test artifacts. The contract is materialized
only under ignored `artifacts/`, mode `0600`, and removed after execution.

The JSON contract must describe the actual reviewed application: image repo,
Docker-image build pack, HTTP `8080` with no host binding, command readiness,
destination/domain/proxy settings, resource budgets, custom options and
rolling/network/retention settings. Its resource budgets must be measured for
NetFilmx. Synthetic test settings are not a production recommendation.
Review persistent PG/key-ring mounts, environment variables and effective
configuration separately. Staging/queue/provider-write access belongs to C;
it is not required for the uploads-disabled catalogue launch.
The client compares API application fields; it cannot prove mount contents,
worker flags, kernel restrictions or deployment-environment protections.

`infra.coolify_release` validates attested digest/revision at workflow preflight,
then checks a healthy baseline, saved immutable rollback image, public
revision, private settings and absence of an active release. It patches only
the image tag, reads it back, queues one deployment and polls its UUID. During
overlap only the old/new revisions are allowed. Three consecutive probe
failures or a timeout cancel the release and require confirmed termination
before rollback. An uncertain write/status stops mutations for reconciliation.
Before any error-triggered rollback, the client confirms the candidate UUID
is terminal. A still-active candidate must complete bounded cancellation;
unknown/unreadable state or an unconfirmed queue reply stops mutations.
Unknown statuses are classified before public-probe failure handling. Bounded
HTTP protocol errors count as failed health probes; unexpected errors also pass
through the terminal-state guard. Rollback polling preserves uncertainty and
confirms termination on other post-queue failures. Known terminal failures
restore only the saved app digest and verify baseline behavior.

Stale automatic main releases are skipped. Manual dispatch can select an older
attested main digest and derive its revision. A healthy matching digest/revision
performs smoke verification without recreating the application.

## Bootstrap and stateful closeout

Image rollback does not reverse schemas, restore databases, reset accounts or
change media. Apply reviewed changes through the
[explicit migration operation](release-database.md), with workers disabled.
Review old/new schema compatibility; an incompatible migration may use a
maintenance window. Strict readiness rejects newer migration history, so an
arbitrary older image is not automatically a compatible rollback target.

This client requires an existing healthy digest-pinned release with the stable
health/catalogue contract. It cannot bootstrap a nonexistent Coolify resource
or migrate the legacy SQLite production directly. The first candidate resource,
private contract, database, keys, migrations/import and public cutover follow
**stage A** of [the first-release plan](first-release-plan.md). Use the same
published attested main digest for offline database preparation and initial web.
Keep both release flags false, record the acknowledged initial UUID and reconcile
uncertain outcomes before another write. Do not fabricate a healthy baseline,
skip its check or invoke the normal releaser to create the first deployment.

Until public bootstrap smoke passes there is no accepted new-image baseline.
On failure, retain new PG/keys and evidence, hold routing/maintenance and
inspect/fix/redeploy under the agreed instruction. A legacy SQLite image cannot
recover new PG state. Existing legacy copies/containers remain untouched;
no new legacy backup, off-host transfer or restore is a prerequisite.

**Stage B** then accepts actual rolling/rollback with a distinct compatible
successor, shared PG/keys, session behavior and measured overlap headroom.
Configure scheduled protected backups of the **new PostgreSQL, keyring and
required recovery configuration**: coordinator supplies destination/access,
local/off-host coverage, cadence, retention/capacity and recovery objectives.
Check a selected set in isolation and record useful failure visibility.
Reuse accepted app-specific local evidence; no universal replay of fault/load
drills or old-version restore. A persistent mount alone is not a backup.

After baseline/private-contract acceptance, separately approve manual promotion;
accept the real caller before enabling automatic promotion after B. Keep R1's
terminal-state and uncertainty rules above intact in both normal release paths.

**Stage C** retains separate shared staging/queue/retry/duplicate/encoder/source
recovery and full-film budgets. Uploads/worker stay false; catalogue rolling in B
does not imply safe active encoder handover. Process-local HTTP limits during
overlap still need a NetFilmx-specific review; another app's exception does not transfer.

HLS publication/readback, all 17 manifest references and local final-image
migration/import/restart/player qualification at `6f57dbb` are coordinator-accepted.
The former derivative/licence import blocker is resolved. Preserve the seven-film,
ten-VTT package and credits; do not repeat transfer, encoding or accepted media
tests. A still checks actual deployed app routing/login/player integration.
Sintel synchronization remains unresolved; deferred manual trials remain deferred.

See [work status](work-status.md) for evidence and the next operator step.
