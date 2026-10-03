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

Local Release suite: **243 passed, 0 failed, 0 skipped**, including isolated
PostgreSQL, SQLite and synthetic FFmpeg processing. Fourteen added cases cover
MVC antiforgery after restart, two live hosts, rotation/expired-key retention,
ring/application isolation and invalid storage. Locked NuGet restore/audit passed.
Existing compiler/nullability warnings remain. Current changes have not yet
been tested by GitHub CI or inside the final runtime image.

## Remaining gates and next step

Next: explicit bounded application/Hangfire migrations, schema/dependency
readiness and single worker ownership. Then qualify .NET 10 and immutable
GHCR/Coolify delivery. Keep this PR a draft; merging while the old main-push
SSH deploy trigger exists is forbidden by the accepted handoff.

Live key mounts/ownership/restore, legacy writer identification and fresh scoped
data recovery remain open. Media needs two browser derivatives, playback/seek,
credits/licences and an actual fresh-catalogue import. Uploads remain disabled
pending mounted staging/queue recovery, rolling and resource acceptance.
Public cutover, cleanup and UI follow those gates. No operator production action
is requested at this local implementation checkpoint.
