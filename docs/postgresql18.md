# PostgreSQL 18 selection and local qualification (NP18-1)

Updated 2026-10-22. The target is a **fresh** PostgreSQL catalogue, with new
accounts and empty history. Earlier PG16 qualification remains historical;
this is neither a PG16 upgrade nor legacy recovery. Deployment is separate.

## Exact image and storage

Canonical local selection: [infra/postgresql.json](../infra/postgresql.json).
CI and developer Compose repeat the pin; a regression checks parity.

```text
docker.io/library/postgres:18.6-trixie@sha256:edb0c08dc33befd0262ab3b5cf1c4f3f8cfd8b09e88c05b45adee29d6761ddb6
platform: linux/amd64
amd64 manifest: sha256:9770878138a2e83abcb10856d30cc3f24dae0d317bb956db6ab9159de6c3c80d
image PG_VERSION: 18.6-1.pgdg13+2
volume target: /var/lib/postgresql
PGDATA: /var/lib/postgresql/18/docker
```

PostgreSQL 18.6 is the current supported 18.x patch at selection; major 18 is
supported until 2030-11-14 ([version policy](https://www.postgresql.org/support/versioning/)).
The tag/digest was read from the official registry. The
[official image source](https://github.com/docker-library/postgres/blob/e00e1bd34ec5c8a8e7ad89b273b3d42efaf6d5bc/18/trixie/Dockerfile)
and [image storage guidance](https://github.com/docker-library/docs/blob/master/postgres/README.md#pgdata)
define the versioned PGDATA and parent volume. The local harness checks the
actual server/tool versions, image platform, effective mounts and data_directory.
A tag alone is not an immutable selection.

Mount a **new named persistent volume at the parent path**, not the former
`/var/lib/postgresql/data`. Never attach PG16 data or a live/legacy volume.
CI/image smoke use bounded tmpfs at the same parent; they do not prove durability.
The focused qualification recreates PG with the same owned named volume and
compares retained IDs, series links and all 17 media mappings. The existing
final-catalogue harness inherits this selection; its earlier media results used
PG16 and are preserved, without another media/browser run.

## Fresh local developer database

Do not start or remove the user's old Compose environment. In this candidate
checkout, use a separate project and the new `pg18data` volume:

```bash
# Set NETFILMX_DEV_POSTGRES_PASSWORD privately in your local shell first.
docker compose -p netfilmx-pg18 config --quiet
docker compose -p netfilmx-pg18 up -d
```

The proposed local connection is `Host=127.0.0.1;Port=15432;Database=netfilmx_db;Username=netfilmx_user`
plus the locally supplied password. The loopback port can be set with
`NETFILMX_DEV_POSTGRES_PORT`; it is not a production port. Old `pgdata` and old
containers remain untouched. Never use `down --volumes` against an old project.
Compose is not started by NP18-1. Its bootstrap user is for disposable development;
production separates DDL ownership from the runtime login.

## Focused local qualification

Use the existing [recovery harness](catalogue-recovery.md) and its helper, with
no HTTP media fetch, player, encoder or legacy operations:

```bash
REVISION=$(git rev-parse HEAD)
docker pull docker.io/library/postgres:18.6-trixie@sha256:edb0c08dc33befd0262ab3b5cf1c4f3f8cfd8b09e88c05b45adee29d6761ddb6
docker build --file infra/Dockerfile --build-arg "RELEASE_REVISION=$REVISION" \
  --tag "netfilmx:pg18-$REVISION" .
python3 infra/catalogue-recovery.py "netfilmx:pg18-$REVISION" "$REVISION" \
  --database-only --media-origin https://netfilmx-assets.grela.dev
```

The tool requires a new output directory under ignored artifacts. Its eight-minute
wall bound includes helper compilation. Each PG/web has 1 CPU, 512 MiB RAM,
RAM+swap=512 MiB, no extra swap; a monitored PG disk stop budget of 512 MiB
is not a filesystem quota. Require six logical CPUs, 4 GiB available memory and
4 GiB free disk on the local host. Stop/report on failure, OOM or an exhausted
bound; do not silently increase caps.

Checks: explicit migration; runtime DML with denied schema DDL and migration-history
INSERT/UPDATE/DELETE; production CLI import of the unchanged approved manifest
(7 videos / 1 series / 3 links / 10 captions / no users/history), repeat refusal
with stable IDs/URLs; web recreation and same-volume PG recreation; real HTTPS
registration and successful login, refresh/logout and cross-peer antiforgery on
two actual webs sharing PG/keyring; one small matching-version dump/restore into
a different owned PG volume, deliberate roles/grants and unchanged mappings.
The DB-only mode **reuses its original keyring**; no new key backup/restore drill.

The normal .NET suite covers PG migrations, contention/newer-schema and queue
behavior via `NETFILMX_TEST_POSTGRES` pointing only to a disposable service.
Existing Npgsql EF provider 10.0.3 / EF Core 10.0.12 and Hangfire.PostgreSql 1.20.12
are retained; no application dependency/SQL change is justified without a
reproduced incompatibility. Local results and CI are recorded in the restricted
NP18-1 report/checkpoint, including any failures. HTTP form checks do not claim
browser/player, production load, rolling deployment or production restore acceptance.

## Proposed Coolify settings — coordinator review before startup

| Setting | Proposal |
| --- | --- |
| Image | Exact 18.6-trixie index pin above; linux/amd64 |
| Storage | New named persistent volume → `/var/lib/postgresql`; PGDATA `/var/lib/postgresql/18/docker` |
| Database / bootstrap owner | `netfilmx` / `postgres`; new secret supplied privately by operator |
| Network | Coordinator's reviewed dedicated destination; internal 5432, no host/public port |
| Runtime credentials | Separate nonsuperuser DML/sequence/schema-use login; no DDL or migration-history writes; private injected connection |
| Starting caps | PG 1 CPU / 512 MiB, RAM+swap 512 MiB; each web the same |
| PG arguments | `-c max_wal_size=64MB -c min_wal_size=32MB -c temp_file_limit=32768` (32 MiB temp per process; WAL target is not a hard disk quota) |
| Web keys | Separate persistent `/var/lib/netfilmx/keyring`, UID/GID 10001:10001, directory 0700; stable JWT settings |
| Delivery flags | Uploads, worker and demo data false; release activation flags remain false |

In Coolify, read back the **generated effective mount** and SHOW data_directory
before migration. Do not accept a generic PG16 storage default, nested anonymous
volume or desired UI value alone. See [Coolify storage documentation](https://coolify.io/docs/databases/configuration/persistent-storage).
One web + PG configures 1 GiB RAM; two webs + PG configure 1.5 GiB during overlap,
plus host/proxy/tools headroom. These are initial proposals qualified only in the
bounded local scope. Persistent storage is not a backup. Stage B still schedules
new PG/keys/configuration backups and proportionate restore/failure verification.

Coordinator must supply actual Coolify app/destination/resource identities,
volume identity/capacity/free-space alert policy, private DDL/runtime/JWT values,
proxy peers/origin/health configuration and current host headroom. No proxy IP
is inferred from the empty proposed Docker network. Keep the A bootstrap
separate from the healthy-baseline normal releaser and preserve R1. An uncertain
migration/release outcome stops further mutations for reconciliation. Full
[release A/B/C instructions](first-release-plan.md) remain authoritative.
