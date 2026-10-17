# Local catalogue recovery qualification

This harness qualifies the first catalogue stage with uploads and worker off.
It creates only local resources with a unique `netfilmx-catalogue-*` ownership
label and refuses a non-Unix Docker endpoint. It neither contacts R2/VPS nor
changes repository protection or deploys an image.

From a clean candidate checkout, build its image with the actual source SHA:

```bash
REVISION=$(git rev-parse HEAD)
docker build --file infra/Dockerfile --build-arg "RELEASE_REVISION=$REVISION" \
  --tag "netfilmx:catalogue-$REVISION" .
python3 infra/catalogue-recovery.py "netfilmx:catalogue-$REVISION" "$REVISION"
```

Use at least six local logical CPUs, 4 GiB **available** host memory and 4 GiB
free disk. The eight-minute watchdog includes helper compilation; individual
operations also have deadlines. The image build is a separate bounded preparation
step. Docker/cgroup v2, Python 3.11+, OpenSSL and the pinned PG image are required.

Each actual web and PG container is capped at 1 CPU / 512 MiB memory, with total
RAM+swap 512 MiB. Both original and restored PG use disposable persistent volumes,
with cgroup readback of memory.max, memory.swap.max=0 and cpu.max;
with a monitored 512 MiB disk budget per active PG; this guard is not a filesystem
quota. PG also has bounded WAL/temp-file settings. The local TLS gateway has
0.5 CPU / 256 MiB and transient tools 1 CPU / 512 MiB. A conservative maximum
includes two PGs, two webs, gateway and a tool: 5.5 CPUs / 2816 MiB. The source PG
is stopped before the restored one is started. Stop on wall/disk/headroom bounds,
OOM, unexpected exit or unreadable metrics; report failure rather than weakening
the proposed limits. No full-length transcoding is run.

## What is exercised

The fixture helper is compiled against DLLs copied from the exact candidate;
the harness verifies that the importer/storage DLLs are byte-identical. It is a
separate test image and adds no production command, manifest override or schema.
Its completed plan uses synthetic `videos/qualification/` URLs at an HTTPS test
origin, based on the seven retained metadata records. No media is fetched and
no original/playback/licence acceptance is inferred from this import.

1. Run the candidate's explicit migration. Its unchanged production catalogue
   command must refuse both pending playback entries. Use the importer library
   for the labelled fixture, verify counts/series links/generated IDs, and refuse
   repeat import and an account-only nonempty DB without partial catalogue writes.
2. Supply a nonsuperuser runtime role with CRUD and sequence use, schema use and
   migration-history reads; no database/role creation or schema DDL. Execute real
   runtime import/read/write operations and prove CREATE TABLE is denied.
3. Run two actual web containers with the same private 0700 key volume and stable
   JWT settings. A loopback-only TLS fixture gateway forwards to either container;
   each trusts only its exact gateway peer. PG/web use an internal network; only
   the gateway joins a second owned network for the loopback publication.
   The Python client verifies the local
   test certificate, handles Secure cookies and uses real MVC tokens/forms.
4. Register through one web using the other's form, verify the regular-user
   session/CSRF refresh across peers, recreate one web while its peer remains
   ready, then reuse the pre-recreation MVC form and session.
5. Stop scoped web writers, take a consistent custom-format PG dump and keyring
   archive, stop the source PG, and restore into new persistent volumes. Restore
   required roles/grants, compare counts and reuse the pre-backup form/cookies
   against both new web containers. Check refresh and logout revocation.
6. Recreate one restored web with an independent keyring: the saved form must
   fail HTTP 400. Restore the correct ring and require the same form to work.

The saved anonymous login form uses a deliberately incorrect fixture password;
HTTP 200 proves MVC accepted its antiforgery token without creating another
session. The real registered session is verified separately by refresh/revocation,
including across DB restore. This avoids relying only on stateless JWT decoding.

## Evidence and cleanup

`artifacts/catalogue-recovery/<run>/results.json` records source/image identity,
cases, counts, per-instance cgroup memory peak/CPU/PIDs, PG disk, archive sizes,
restore and total duration. Output is ignored/private (directory 0700, JSON 0600).
It contains no key XML, cookies, password hashes or credential-value hashes.

Cleanup checks each resource's run label before removal, removes only scoped
containers/volumes/network and deletes synthetic env/cert/DB/key archives. Local
candidate/helper images remain for repeat testing. Cleanup failure marks the run
failed and retains owned identifiers for reconciliation; no global prune is used.

These results cover an isolated catalogue fixture and real local containers.
Production mounts, licensed media/browser playback, public identity/rate behavior,
protected Coolify promotion/rollback, backup policy and legacy writer recovery
remain separate gates in [the first-release plan](first-release-plan.md).
Queue/staging/encoder handover/forced stop and full-film budgets belong to later
upload/worker activation and are not exercised here.
