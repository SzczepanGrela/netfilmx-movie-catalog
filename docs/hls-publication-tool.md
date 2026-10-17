# One-time publication of the retained HLS packet

`qualification/publish_hls.py` prepares or publishes one reviewed packet with
AWS CLI/S3. It is separate from application uploads and the FFmpeg pipeline.
Uploads/worker remain false. The accepted HLS implementation is a357fd4; this
tool requires its own coordinator review and a separate publication instruction.
No credentials or infrastructure identifiers are embedded in the tool.

## Local dry-run, the default

Run from the candidate checkout with Python 3.11+ on Linux/POSIX:

```bash
HLS_PACKET=artifacts/hls/20261017-catalogue/publication-proposal
HLS_RECORD_SHA=bd89e9a34cf0ff6a0268608356fa45be7eed08ecfc4a92faaa5a810755c1ee88
python3 qualification/publish_hls.py \
  --package "$HLS_PACKET" --approved-record-sha256 "$HLS_RECORD_SHA" \
  --output artifacts/hls/publication-dry-run
```

This mode does not initialize AWS CLI, credentials, HTTP clients or remote
connections. AWS CLI need not be installed for the dry-run. The original
publication-record and packet are read only. Use a new private output directory;
it must not overlap the packet or media. Results identify the exact record/list
hashes, tool hash, counts and bytes. `transferComplete` stays false.

Preflight checks the approved record digest, mapping/patch digests, exact
upload-order/checksum lists, totals, uniqueness, safe regular local files without
symlinks, all lengths/SHA-256, MIME/cache metadata and the complete playlist graph.
All files must validate before any remote operation. The script does not run
FFmpeg, alter timestamps, generate keys or activate a manifest. It uses the
existing local playlist parser; no media is re-encoded or probed.

## Conditional execution, only after separate authorization

The coordinator/operator supplies the already agreed named profile, endpoint and
bucket from the private publication plan. AWS CLI v2 must support
`s3api put-object --if-none-match`. Do not pass access keys/tokens, search for
credentials or configure a profile through this script. Keep secrets in the
operator-managed AWS credential mechanism. No profile inventory is queried.

After authorization, with `HLS_S3_PROFILE`, `HLS_S3_ENDPOINT` and `HLS_S3_BUCKET`
set to the approved values:

```bash
python3 qualification/publish_hls.py --execute \
  --package "$HLS_PACKET" --approved-record-sha256 "$HLS_RECORD_SHA" \
  --profile "$HLS_S3_PROFILE" --endpoint "$HLS_S3_ENDPOINT" \
  --bucket "$HLS_S3_BUCKET" --output artifacts/hls/publication-s3
```

Use a distinct journal from the dry-run. Only one executor uses it; an exclusive
file lock rejects concurrent use. The script follows the approved list exactly:
segments/VTT, variant playlists, then every master. It uses single PutObject
operations for files up to 5 MiB (the reviewed packet's maximum is 2328944 bytes),
never multipart, sync, delete or unconditional overwrite. MIME/Cache-Control come
unchanged from the packet. No bucket creation or CORS operation exists.

For each key it performs a full S3 GET. An existing object is skipped only after
full content hash, byte length, Content-Type and Cache-Control match. Only a
specific NoSuchKey permits a conditional PutObject. Every PutObject uses
`If-None-Match: *`, followed by another complete GET verification. A 412 requires
that same full readback; it is not success by itself. ETag is never identity.
Conflict, refusal, failed readback or uncertain transport stops the run and
prevents later masters. Verified dependencies gate all master writes.

AWS retries are disabled. Timeout, Ctrl+C or SIGTERM may leave the current write
committed remotely; such an attempt is not relabelled as an ordinary failure.
The source file is copied to a private verified temporary snapshot before PUT.
Keep source files and packet frozen while running. Stop preserves uploaded
objects, source files and logs; there is no automatic deletion or rollback.

## Resume with the same list and target

Repeat the exact execution command with the same output directory and add
`--resume`. The record digest, exact upload-list digest, mode, profile, endpoint
and bucket must match its binding. Each invocation gets a separate attempt ID.
`objects.jsonl` is append only and flushed/fsynced; `attempt-*.json` retain attempt
results, while `result.json` describes the latest attempt. Logs are private and
do not contain raw AWS errors/responses, secrets or signed URLs.

Resume performs full remote verification again for every key, including entries
previously logged as successful. If an unknown prior PUT is followed by a
NoSuchKey, this does not prove that prior PUT failed. A new explicit attempt
still uses the same conditional creation; no unconditional retry is available.
Only full confirmation of every object sets `transferComplete=true`.

If the journal is truncated/corrupt, preserve it. Start a new journal with the
same approved packet and target after confirming the prior executor has stopped.
Fresh execution still rechecks remote objects and uses conditional PUTs.
Never repair a conflict by changing keys, dropping the condition or deleting data.

## Separate HTTPS verification, after authorized publication

With the approved media and application HTTPS origins:

```bash
python3 qualification/publish_hls.py --verify-https \
  --package "$HLS_PACKET" --approved-record-sha256 "$HLS_RECORD_SHA" \
  --media-origin "$HLS_MEDIA_ORIGIN" --app-origin "$HLS_APP_ORIGIN" \
  --output artifacts/hls/publication-https
```

This explicit network mode needs no S3 profile or credentials. It checks every
object with a full GET/hash/length, HEAD, a bounded real 206 Range/body comparison
and OPTIONS preflight. MIME/cache, exact application-origin allowance, exposed
headers and Range/method permissions must pass. The local graph plus exact remote
playlist hashes verifies all references. Redirects, credential/query URLs and
non-HTTPS origins are rejected; normal TLS certificate verification remains on.
HTTP environment proxies are not inherited. `--resume` rechecks the whole list
against the same origins, retaining previous attempts.

`httpVerified=true` means those HTTP checks passed. `browserPlayerAccepted` and
`manifestActivated` remain false; this is not a browser/player, physical device,
full listening or final-image catalogue acceptance. CORS is currently absent
according to the coordinator's readback. The operator must agree/configure it
separately; this tool neither changes it nor treats missing CORS as acceptable.

Only a later explicit authorization permits the current seventeen-reference
manifest activation and final-image migration/import/restart/published-HLS
qualification. The old two-MP4/ten-VTT patch remains historical.

## Tests and primary references

`python3 -m unittest discover -s tests -p test_hls_publication.py -v` uses tiny
synthetic files, fake S3 and a loopback HTTP server. No test calls actual R2.
Actual domain/TLS/CORS and actual AWS profile/endpoint access remain untested
until the separately authorized stage. Accepted HLS media tests are not repeated.

- [AWS CLI PutObject](https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object.html)
- [AWS CLI GetObject](https://docs.aws.amazon.com/cli/latest/reference/s3api/get-object.html)
- [R2 conditional PutObject](https://developers.cloudflare.com/r2/api/s3/extensions/#conditional-operations-in-putobject)
- [R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/)
