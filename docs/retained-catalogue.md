# Preparing the retained-media catalogue

The release candidate includes an explicit catalogue plan for seven distinct
films/episodes and the Caminandes series. It reuses existing object keys.
The old SQLite catalogue, the local demo SQL and the generated media manifest
are separate sources; neither the demo SQL nor the old generated seeder is an
authoritative map of retained media.

The new source is
[`retained-media.json`](../NetFilmx_Storage.PostgreSql/Catalogue/retained-media.json),
embedded in the PostgreSQL assembly. It contains metadata, not media bytes or
credentials. It deliberately omits unverified quality/HDR badges, incomplete
bundles and duplicate episodes. Initial credit prices are catalogue metadata
and can be reviewed before release.

## Inspect without a database or provider credentials

```bash
dotnet run --project NetFilmx_Web --no-launch-profile -- catalogue plan
```

For a published application, use `dotnet NetFilmx_Web.dll catalogue plan`.
This administrative path exits before starting HTTP, Hangfire or startup
migrations. It prints seven entries and two pending playback derivatives:

| Film/episode | Retained source key | Playback candidate |
| --- | --- | --- |
| Sintel | videos/sintel.mkv | Pending |
| Tears of Steel | videos/tears-of-steel.mp4 | Same key |
| Charge | videos/charge.webm | Same key |
| Elephants Dream | videos/elephants-dream.mp4 | Same key |
| Caminandes: Llama Drama | videos/caminandes-llama-drama.ogv | Pending |
| Caminandes: Gran Dillama | videos/caminandes-gran-dillama.mp4 | Same key |
| Caminandes: Llamigos | videos/caminandes-llamigos.webm | Same key |

"Candidate" is not browser-playback acceptance. Review media identity, codecs,
seeking/range requests, thumbnails and browser compatibility before importing.
Prepare MP4/HLS derivatives for pending entries under new reviewed keys,
retaining the source objects, then commit their playback keys in the manifest.
No conversion, provider request or upload runs from the catalogue command.
Nullable playback keys keep the current plan intentionally non-importable;
it cannot create a partially available catalogue or substitute a demo stream.

## Import only into a prepared, separate, empty PostgreSQL database

First complete the data/recovery and application release gates in
[the database guide](database-baseline.md). Keep the web application and
workers stopped against the new database during bootstrap. Apply the reviewed
PostgreSQL migrations explicitly using the pinned EF tool. The import command
does not create a database, apply migrations or upgrade a SQLite file.

Supply the separate target database through the runtime environment variable
`ConnectionStrings__DefaultConnection`. Supply the reviewed public media HTTPS
origin through `CloudflareR2__PublicUrl`. Do not put credentials in command
arguments, Git or this document. No R2 API key is required by the importer.

After the manifest and media have been reviewed:

```bash
dotnet NetFilmx_Web.dll catalogue import \
  --confirm-empty-database --confirm-reviewed-media
```

The command refuses pending playback entries, pending database migrations and
an existing catalogue or account. It takes PostgreSQL table locks with a bounded
wait, checks emptiness and commits all catalogue rows and series links in one
transaction. It uses generated IDs without resetting sequences. Running it
again refuses to replace or duplicate the imported catalogue. It does not
create accounts, import user history, schedule jobs, delete rows or mutate
object storage. Preserve the old database independently; this command is not
a backup, recovery tool or migration of existing account balances.

The import's URLs are independent of database IDs. The existing upload/delete
handlers still need an explicit object-ownership policy before production:
their historical `videos/{id}/...` assumptions must not delete unrelated
retained objects. Successful local import tests do not close that release gate.
