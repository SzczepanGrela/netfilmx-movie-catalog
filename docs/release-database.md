# Explicit migrations and readiness

Web startup checks the application schema before accepting HTTP or starting a
worker. It never calls `Migrate()`. Connection configuration is explicit; there
is no built-in database/password fallback. Missing/unreachable databases,
pending migrations, inconsistent/newer migration history, or missing required
tables/columns stop startup. Test fixtures prepare their own isolated databases
before creating the web host.

## Release operation

Inspect/test the migrations, save a consistent recovery copy, review compatibility
with the previous image and stop writers if the schema is incompatible. Supply
the prepared target through `ConnectionStrings__DefaultConnection`, using
separate administrative credentials for DDL. Never pass credentials as command
arguments. From the tested published image run:

```bash
dotnet NetFilmx_Web.dll database migrate --confirm-reviewed-migrations
```

If uploads will be enabled, prepare their PostgreSQL queue in the same operation:

```bash
dotnet NetFilmx_Web.dll database migrate --confirm-reviewed-migrations --prepare-upload-queue
```

This administrative path exits before building the web host, key-ring access,
R2 access or any worker. It creates neither accounts nor catalogue data. Only
the explicit command prepares Hangfire; runtime storage has
`PrepareSchemaIfNecessary=false`. The pinned provider's installer is used
without copying its SQL into the app. Existing newer/invalid queue versions
are rejected before application migration. Readiness requires the exact queue
schema version embedded in the pinned provider.

The operation has a two-minute deadline, five-second connection/lock waits and
60-second PostgreSQL statement limits. A nonpooled PostgreSQL session owns a
database-scoped advisory lock across both schema steps. Another migrator fails
immediately and may retry after the owner exits. Cancellation closes the
installer's session; failed application DDL rolls back its migration. Several
migrations/installer versions commit separately: a failed operation may leave
earlier successful steps applied. Review the state before retrying. There is
no automatic downgrade or database rollback.

Legacy/local SQLite uses an absolute existing parent path, a persistent
`<database>.migration.lock` and a five-second database lock timeout. Keep the web
host/writers stopped for SQLite upgrades. Never unlink active migration lock
files or run the command against the archived original database implicitly.
The production target remains a separately prepared PostgreSQL catalogue.

## Health and compatibility

`GET /health/live` reports `status=live` and an embedded build revision.
`GET /health/ready` reports `status=ready` with HTTP 200 only when the application
schema and required queue are available; a five-second probe budget returns a
generic HTTP 503 on failure. Both use `Cache-Control: no-store` and expose no
connection string, database contents or provider exceptions. Builds without
an embedded 40-character Git revision report `development` and must not be
used for production promotion.

The current application schema is unchanged by these release controls. Old/new
candidate images use the same tables and queued method/arguments. Readiness
requires the release's complete migration history and rejects a newer one. A
future schema change needs an explicit expand/contract and rollback review;
strict readiness is not a promise of compatibility with arbitrary future images.
Keep the current database, keys, queue and staged sources during image rollback.

## Worker ownership

Both `Uploads__Enabled` and `Worker__Enabled` default to false. Enabling uploads
configures queue access for the web process; starting processing also requires
`Worker__Enabled=true` and the private shared staging contract. Only the holder
of `.server.lock` starts a Hangfire server and reconciles intents. Other rolling
instances wait. The owner uses one `video` worker and shuts the server down
before releasing ownership. `.worker.lock` still bounds conversion separately.
Locks target a single host's shared local filesystem; NFS/multiple hosts are
unsupported. Never unlink either lock while instances are running.

Local regressions cover failed/nonmutating startup, repeat migration, PostgreSQL
and SQLite contention, cancelled/failed DDL, newer history/queue rejection,
readiness loss and two real Hangfire hosts transferring ownership. Actual
container termination, saved-release rollback, mounted staging/queue/key restore,
full-film resources and operator-approved rolling/failure drills remain open.
