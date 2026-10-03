# NetFilmx candidate status

Observed 2026-10-03 on `codex/netfilmx-preparation`, based on `a39d3ad6e527bcf08430d311db2c0cf0528820c3`.
Work continues in [draft PR #1](https://github.com/SzczepanGrela/netfilmx-movie-catalog/pull/1).
Production has not changed. These are implementation/test results, pending
coordinator review and deployment acceptance.

## Durable Data Protection: implemented and locally tested

The [key-ring contract](data-protection.md) requires private persistent storage,
stable application/cookie names and startup validation before HTTP/workers.
Keys remain separate from JWT/password configuration. There is no at-rest XML
encryptor; filesystem controls and protected backup/restore still matter.

Local Release suite: **256 passed, 0 failed, 0 skipped**, including isolated
PostgreSQL, SQLite and synthetic FFmpeg processing. Fifteen added key-ring cases cover
MVC antiforgery after restart, two live hosts, rotation/expired-key retention,
ring/application isolation and invalid storage. Locked NuGet restore/audit passed.
Existing compiler/nullability warnings remain. Current changes have not yet
been tested by GitHub CI at this checkpoint. The .NET 10 runtime image has
passed a disposable local smoke; final source-revision qualification follows
the commit. GitHub checks linked in earlier records qualify earlier commits.

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

## .NET 10 and delivery: implemented, local qualification in progress

All five projects/tooling and pinned Docker bases use .NET 10. Locked audited
NuGet restore and the full **256-test** Release suite pass. The
[delivery candidate](release-delivery.md) builds/tests one image, publishes its
immutable digest with provenance/SBOM after the quality gate, and gates Coolify
promotion on private settings plus protected main/production. Old SSH deploy
and diagnosis paths are retired in this candidate. No GHCR digest is published
by local testing; production promotion remains disabled.

Twenty-five Python regressions cover scoped rollback, active-release conflict,
uncertain mutations/status, bounded API/public replies, private-contract drift,
revision/catalogue and antiforgery smoke. Workflow validation with actionlint
passed. Local image qualification covers native H264 tooling and restart on
isolated private keys/PostgreSQL; it does not establish public or VPS acceptance.

## Remaining gates and next step

Next: finish exact-commit image/remote CI qualification and keep PR #1 a draft.
Coordinator/operator must identify the target Coolify resource and review its
private contract, protected main/environment, first healthy rollback baseline
and scoped recovery plan before any production action. On 2026-10-03 the
operator declared that no NetFilmx Coolify resource exists yet; legacy SSH
deployment on the VPS may remain. Read-only GitHub API checks found `main`
unprotected, no environments/rulesets and neither activation flag configured.
No approved deployment window has been supplied to this implementation session.

Browser verification passed **3 DOM tests** and the locked vendor-file check.
Fresh npm install/audit reported **0 vulnerabilities**.

Live key mounts/ownership/restore, legacy writer identification and fresh scoped
data recovery remain open. Media needs two browser derivatives, playback/seek,
credits/licences and an actual fresh-catalogue import. Uploads remain disabled
pending mounted staging/queue recovery, rolling and resource acceptance.
Public cutover, cleanup and UI follow those gates. No operator production action
is requested at this local implementation checkpoint.
