# Database baseline and retained media

This branch prepares NetFilmx for a separate PostgreSQL database. It is not yet
a production deployment or a completed data import.

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

Restore the pinned EF Core 8 tool, then scaffold without loading production
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

The PostgreSQL initial migration inserts no accounts or sample catalogue.
Runtime demo seeding is disabled by default and can only be enabled with
`Database__SeedDemoData=true` in `Development`. The legacy SQLite migration
history is preserved without rewriting existing migrations. Startup now fails if a
migration fails; it must not serve requests against an incomplete schema.

## Regression tests

`dotnet test "ST2 NetFilmx.sln" -c Release` includes an actual SQLite migration
test that preserves catalogue URLs across the translation upgrade.

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

Before implementing or running the import:

1. Identify the authoritative SQLite file and which running instance writes it.
2. Inventory catalogue tables, links, migrations and the R2 object mapping.
3. Agree which catalogue metadata to retain and whether accounts, comments,
   purchases and other user data are to be retained or archived.
4. Back up the live database consistently, retain an off-host copy, and test
   restoration in isolation.
5. Rehearse import into a separate PostgreSQL database. Preserve identifiers
   where required, reset identity sequences after explicit-ID inserts, and
   validate counts, relationships, playback and thumbnails.
6. Prevent new uploads from colliding with retained object prefixes. Current
   processing uses `videos/{videoId}/hls`; restarting IDs at one is unsafe when
   the old objects remain. A separate asset identity or a verified preserved-ID
   strategy is required before enabling uploads.

No live database or R2 objects have been changed by this preparatory work.

## Remaining release gates

The branch preserves previously unpublished work, not just the database fix.
Before a production release it still needs dependency/security remediation,
working authentication/antiforgery tests, rate limiting, trusted proxy handling,
readiness, durable background jobs/media staging, explicit migration execution,
and the protected immutable-image Coolify workflow. The legacy SSH deployment
workflow remains in the repository; **do not merge this draft to trigger it**.

The existing model also reports an extra shadow `BundlePurchase.BundleId1`
relationship. Correcting that relationship needs a separate data-aware change
and tests; it has not been silently removed from the legacy schema here.
