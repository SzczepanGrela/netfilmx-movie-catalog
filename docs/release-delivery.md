# Immutable image delivery candidate

Observed 2026-10-03. This branch prepares the release path. Production has not
changed; [draft PR #1](https://github.com/SzczepanGrela/netfilmx-movie-catalog/pull/1)
still requires coordinator review and app-specific runtime/recovery acceptance.
The operator declared that the NetFilmx Coolify resource has not been created.
Read-only GitHub checks found unprotected main, no environments/rulesets and
no activation flags. Those remote gates remain setup work.

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
Review persistent key-ring/staging mounts, environment variables, private
database/storage access and effective container configuration separately.
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

## Stateful gates

Image rollback does not reverse schemas, restore databases, reset accounts or
change media. Before each release, apply reviewed backward-compatible changes
through the [explicit migration operation](release-database.md), while workers
remain disabled. Review old/new schema compatibility and recovery first.

This client requires an existing healthy digest-pinned release with the stable
health/catalogue contract. It cannot bootstrap a nonexistent Coolify resource
or migrate the legacy SQLite production directly. The first candidate resource,
private contract, database, mounts, migrations and recovery follow the proposed
[first-release and acceptance plan](first-release-plan.md). Its protection,
bootstrap and cutover actions require coordinator/operator review.
Keep legacy writers/data/media retained.

Uploads and workers default off. Single-worker file locks, process-local HTTP
limits, bounded transcoding and shared key storage require NetFilmx-specific
mounted-volume/rolling tests. Other applications' exceptions do not transfer.
Fresh catalogue import remains blocked by two playback derivatives and licence
evidence. Public playback/range/posters, proxy/edge policy, PG/key-ring/staging
recovery and a controlled failed-release rollback remain acceptance work.

See [work status](work-status.md) for evidence and the next operator step.
