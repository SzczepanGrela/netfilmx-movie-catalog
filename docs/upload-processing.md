# Durable upload processing

Uploads are disabled by default. Browsing an existing catalogue does not start
a conversion server. This draft prepares the worker lifecycle; it does not
enable production uploads or mount storage automatically.

## Required runtime configuration

Before enabling uploads, provision a private persistent directory outside the
application/web root. The Linux directory must have mode `0700` and be writable
by the image's fixed UID `10001`. Mount the same directory at the same absolute
container path in every instance during a rolling release. This implementation
targets a single host's local filesystem, not NFS or independent replica disks.

Set these runtime variables only after the mount/recovery gates are accepted:

- `Uploads__Enabled=true`.
- `Uploads__StagingPath=<absolute private mounted directory>`.
- `ConnectionStrings__DefaultConnection=<explicit PostgreSQL connection>`.
- The complete `CloudflareR2` configuration, including `PublicUrl`.

The directory must already exist; startup checks private permissions and write
access. These checks cannot prove that a directory is a persistent mount.
The operator must verify the actual Docker mount and that its contents survive
container recreation. Missing configuration, a public/application staging path,
SQLite job storage or PostgreSQL queue initialization failure must not silently
switch uploads to process memory. Memory storage is removed. With uploads
disabled, the queue, processing server, dispatcher and jobs dashboard are not
started.

The runtime image includes FFmpeg/ffprobe. Current bounds are 1 GB per input,
one Hangfire worker per instance, and one conversion across instances sharing
the staging root. A file lock coordinates those instances and is released by
the OS on process exit; never unlink `.worker.lock` while workers are running.
Conversion allows 30 minutes; individual probes allow 15 seconds. Shutdown
cancels the process tree and the storage transfer. Encoder/probe stdout is
bounded and stderr is drained without retaining an unbounded log buffer.
CPU/RAM/disk limits and representative full-length media remain production
acceptance work; a byte/time limit is not a disk quota or sandbox.

## Lifecycle and recovery

1. Copy input to a new private UUID directory, limiting bytes and writing mode
   `0600`. Flush and rename the completed source before creating a database row.
   Incomplete/cancelled requests do not publish a partial source. Client
   filenames are not used as filesystem paths.
2. Save `SourceUploadId` with the video in its existing database transaction.
   This is the durable intent to process the file. Queue arguments contain the
   video/upload identifiers, never a client-supplied local path or media bytes.
3. A dispatcher polls committed intents every 15 seconds in bounded batches
   and writes `UploadJobId` after PostgreSQL-backed Hangfire accepts the job.
   A queue outage preserves the intent for another attempt. A crash between
   enqueue and recording the job ID may deliver the same work twice.
4. The worker locks the shared staging root, reads the current row and verifies
   upload identity. Already-published rows are not converted/uploaded again.
   It converts in a private work directory and uploads to a fresh R2 prefix.
   Before saving it rereads the row and uses optimistic concurrency to avoid
   overwriting an intervening catalogue edit/deletion.
5. Delete the staged source only after a committed result. Conversion/transfer
   failure throws for Hangfire retries (three automatic retries), keeping the
   source. A graceful shutdown cancels work and preserves the intent/source.
   After retries are exhausted, diagnose the failed job before a manual retry.
   Restoring a missing source must preserve its exact upload identity.

Hangfire documents [identifier-sized arguments](https://docs.hangfire.io/en/latest/background-methods/passing-arguments.html)
and [cancellation/requeue behavior](https://docs.hangfire.io/en/latest/background-methods/using-cancellation-tokens.html).
These mechanisms do not provide an exactly-once transaction spanning R2 and
the application database: interrupted transfers, a successful upload followed
by a failed DB commit, or a concurrent admin edit can leave R2 objects behind.
Staging created before an unsuccessful catalogue save, deleted catalogue rows,
and killed-process work directories can also leave unreferenced local files.
Retain them for reviewed cleanup; no automatic orphan deletion is installed.

Apply both the application migration and reviewed Hangfire schema setup before
enabling the candidate. Do not roll back by dropping upload columns while jobs
remain: keep the current database and staging files, and disable uploads/workers
if a rollback image cannot understand the persisted job method/arguments.
An image rollback alone cannot restore missing input or undo an R2 upload.

## Validation and remaining acceptance

Automated tests use actual SQLite, disposable PostgreSQL/Hangfire storage,
mocked R2 transport, private temporary files and a short synthetic FFmpeg input.
They cover persistent intent/queue reconnection, replay after a new context,
failed upload/conversion retry, cancellation, unchanged admin edits, staging
permissions/path checks, and lock exclusion including another Linux process.

Still required before public file upload: exact candidate-image tests, mounted
directory and PostgreSQL recovery, forced worker/container restart during each
phase, rolling overlap on the actual filesystem, disk-pressure and full-film
resource tests, image/media content validation and orphan retention policy.
The existing authentication/antiforgery/dependency and protected-delivery gates
remain open. Original databases and retained R2 objects are unchanged by these
local tests.
