# Database baseline and retained media

This branch targets a fresh [PostgreSQL 18 database](postgresql18.md), with an
explicitly isolated new development volume. Local catalogue import is qualified;
production deployment/import remains separate.

The recovered local commits included about 1.7 GB of media in `r2_assets/`.
Those files remain in the original local checkout/source backup and are excluded
from this branch's new history and Docker context. Media belong in object
storage; this source reconciliation neither uploads nor deletes R2 objects.

## Provider-specific migrations

- `NetFilmx_Storage/Migrations` retains the legacy SQLite history.
- `NetFilmx_Storage.PostgreSql/Migrations` creates an empty PostgreSQL schema,
  including translations, identity columns, indexes and foreign keys.
- Runtime configuration uses `NetFilmxDatabaseOptions` to select the same
  migrations as the provider. PostgreSQL connection strings currently require
  the `Host=` keyword; SQLite uses `Data Source=`.
- These migration sets create/update their respective databases. Applying the
  PostgreSQL set does **not** import or convert a SQLite database. Do not point
  the initial PostgreSQL migration at a database created with the mixed legacy
  migration chain.
- Persisted application timestamps are UTC. Importing legacy timestamps needs
  an explicit source-timezone decision; do not silently relabel old local times.

The separation follows the [EF Core multiple-provider guidance](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/providers).
The old mixed chain can generate SQL but fails on PostgreSQL when converting
`CreatedAt` from SQLite-style text to `timestamp with time zone`.

Restore the pinned EF Core 10 tool, then scaffold without loading production
configuration or running the web application:

```bash
dotnet tool restore
dotnet ef migrations add ChangeName \
  --project NetFilmx_Storage.PostgreSql \
  --startup-project NetFilmx_Storage.PostgreSql
```

For subsequent model changes, also create and test the corresponding SQLite
migration while SQLite support is retained. Its design-time factory is in
`NetFilmx_Storage`. Never edit an already-applied production migration to hide
schema differences.

`DurableUploadIntent` adds nullable `SourceUploadId` and `UploadJobId` columns
to Videos in each provider. Existing catalogue entries remain unqueued. The
historical SQLite snapshot included PostgreSQL type names; its refreshed
snapshot uses SQLite types, while the actual new migration only adds those two
columns. It deliberately avoids unrelated table/type rewrites. Video URL and
upload identity use optimistic concurrency checks when saving worker results.

The PostgreSQL initial migration inserts no accounts or sample catalogue.
Runtime demo seeding is disabled by default and can only be enabled with
`Database__SeedDemoData=true` in `Development`. The legacy SQLite migration
history is preserved without rewriting existing migrations. Web startup checks
readiness without changing the schema; apply migrations through the
[explicit release operation](release-database.md) before traffic/workers.

## Regression tests

`dotnet test "ST2 NetFilmx.sln" -c Release` includes actual SQLite migration
tests starting at both `InitialSqlite` and the later pre-translation schema.
They preserve sparse catalogue IDs, remote/relative media URLs, prices, views,
legacy timestamps and category/series/tag links through all migrations. They
also verify translation insertion and a new ID above the retained IDs. The
fixtures use historical columns, so newer model properties cannot conceal a
missing step in the oldest upgrade path. These tests do not perform a
SQLite-to-PostgreSQL import or authorize upgrading the live SQLite file.

Set `NETFILMX_TEST_POSTGRES` to a **disposable local/CI PostgreSQL service** to
run the PostgreSQL tests. The test role needs `CREATE DATABASE` permission.
Each test creates a randomly named database and drops only that database on
completion. The database named in the connection string is used to create the
test databases; it is not migrated or seeded. Never use production credentials
for this setting. The CI job supplies its PostgreSQL service connection.

The PostgreSQL tests apply real migrations, check model/snapshot agreement,
empty initial tables, repeated migration, generated IDs, UTC timestamps,
decimal values, catalogue relations and unique translation constraints.
Without the environment variable they report an explicit skip.

## Retaining existing R2 media

Starting a new database does not require uploading the same media again.
Existing object keys/URLs can be imported along with the catalogue metadata,
provided those objects are retained and the mappings are verified.

The operator-selected first launch uses fresh PG, new accounts and empty history.
The accepted manifest contains seven published HLS masters and ten Sintel VTT
references; the former two-derivative/licence blocker is resolved. Use the
[explicit catalogue CLI](retained-catalogue.md) and ordered
[first-release plan](first-release-plan.md); no additional legacy inventory,
backup/off-host/restore or SQLite-to-PG data import is assigned. Preserve the
legacy history, copies and source mappings. New-state backup/recovery belongs
to stage B. Catalogue deletion retains media; future uploads retain their
separate [processing acceptance](upload-processing.md).

## Remaining release gates

The branch preserves previously unpublished work, not just the database fix.
Authentication/antiforgery, patched locked dependencies, durable upload jobs and
[HTTP/media admission controls](http-security.md) are implemented and tested
locally. Production qualification still needs exact proxy/edge acceptance,
mounted [Data Protection keys](data-protection.md), live migration/readiness acceptance,
mounted staging/queue restart and resource tests, media playback/credits/licences,
and the protected immutable-image Coolify workflow. The candidate replaces
legacy SSH deployment, but **keep this PR a draft until delivery/stateful
acceptance**. See the [release delivery guide](release-delivery.md).

The existing model also reports an extra shadow `BundlePurchase.BundleId1`
relationship. Correcting that relationship needs a separate data-aware change
and tests; it has not been silently removed from the legacy schema here.
