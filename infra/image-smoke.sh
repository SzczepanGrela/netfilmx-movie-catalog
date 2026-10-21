#!/usr/bin/env bash
set -euo pipefail
image=${1:?Supply the exact image reference}
revision=${2:?Supply the full source revision}
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || exit 64
# Shared local selection; CI/Compose parity is checked by tests/test_postgresql_config.py.
mapfile -t pg_config < <(python3 - <<'PYCONFIG'
import json
from pathlib import Path
c = json.loads(Path("infra/postgresql.json").read_text())
print(c["image"]); print(c["volumeTarget"]); print(c["pgdata"])
for setting in c["settings"]: print(setting)
PYCONFIG
)
[[ ${#pg_config[@]} == 6 ]]
pg_options=()
for setting in "${pg_config[@]:3}"; do pg_options+=(-c "$setting"); done
scope="netfilmx-smoke-$(date +%s)-$$"
network="${scope}-network"
database="${scope}-postgres"
application="${scope}-web"
keys="${scope}-keys"
network_created=false
database_created=false
application_created=false
keys_created=false
cleanup() {
    if $application_created; then docker rm --force "$application" >/dev/null 2>&1 || true; fi
    if $database_created; then docker rm --force "$database" >/dev/null 2>&1 || true; fi
    if $keys_created; then docker volume rm "$keys" >/dev/null 2>&1 || true; fi
    if $network_created; then docker network rm "$network" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT
docker network create --internal "$network" >/dev/null
network_created=true
docker volume create --label netfilmx.test="$scope" "$keys" >/dev/null
keys_created=true
docker run --rm --network none --user 0:0 --entrypoint sh \
    --mount "type=volume,source=$keys,target=/keys" "$image" \
    -c 'chown 10001:10001 /keys && chmod 0700 /keys'
docker run --detach --name "$database" --network "$network" --network-alias database \
    --cpus 1 --memory 512m --memory-swap 512m --pids-limit 128 \
    --tmpfs "${pg_config[1]}:rw,nosuid,nodev,size=384m" \
    --env "PGDATA=${pg_config[2]}" \
    --env POSTGRES_USER=netfilmx_test --env POSTGRES_PASSWORD=local-image-test \
    --env POSTGRES_DB=netfilmx_test \
    "${pg_config[0]}" "${pg_options[@]}" >/dev/null
database_created=true
for _ in {1..30}; do
    if docker exec "$database" pg_isready -h 127.0.0.1 -U netfilmx_test -d netfilmx_test >/dev/null; then break; fi
    sleep 1
done
connection='Host=database;Database=netfilmx_test;Username=netfilmx_test;Password=local-image-test'
docker run --rm --network "$network" --cpus 1 --memory 512m --cap-drop ALL --init \
    --env "ConnectionStrings__DefaultConnection=$connection" "$image" \
    database migrate --confirm-reviewed-migrations
# Exercise the embedded shipping manifest through the production CLI, without
# contacting the synthetic media origin. Counts and IDs must survive restart.
catalogue_args=(--rm --network "$network" --cpus 1 --memory 512m --cap-drop ALL --init
    --env "ConnectionStrings__DefaultConnection=$connection"
    --env CloudflareR2__PublicUrl=https://media.example.test)
docker run "${catalogue_args[@]}" "$image" catalogue import --confirm-empty-database --confirm-reviewed-media
snapshot() {
    docker exec "$database" psql -X -qAt -v ON_ERROR_STOP=1 -U netfilmx_test -d netfilmx_test -c '
        SELECT (SELECT count(*) FROM "Videos"), (SELECT count(*) FROM "Series"),
            (SELECT count(*) FROM "VideoSeries"), (SELECT count(*) FROM "VideoSubtitles"),
            (SELECT count(*) FROM "Users");
        SELECT "Id", "Title", "VideoUrl" FROM "Videos" ORDER BY "Id";
        SELECT "Id", "VideoId", "TrackKey", "Language", "Label", "Url", "Position" FROM "VideoSubtitles" ORDER BY "Id";'
}
initial_catalogue=$(snapshot)
[[ "${initial_catalogue%%$'\n'*}" == '7|1|3|10|0' ]]
if docker run "${catalogue_args[@]}" "$image" catalogue import --confirm-empty-database --confirm-reviewed-media; then
    echo 'Repeated catalogue import unexpectedly succeeded.' >&2; exit 1
fi
[[ "$(snapshot)" == "$initial_catalogue" ]]
docker run --detach --name "$application" --network "$network" \
    --cpus 1 --memory 512m --memory-swap 512m --cap-drop ALL --init \
    --mount "type=volume,source=$keys,target=/var/lib/netfilmx/keyring" \
    --env "ConnectionStrings__DefaultConnection=$connection" \
    --env DataProtection__KeyRingPath=/var/lib/netfilmx/keyring \
    --env JwtSettings__SecretKey=PublicSyntheticImageTestKeyAtLeast32Bytes \
    --env JwtSettings__Issuer=image-test --env JwtSettings__Audience=image-test \
    --env Uploads__Enabled=false --env Worker__Enabled=false "$image" >/dev/null
application_created=true
health=starting
for _ in {1..40}; do
    health=$(docker inspect --format '{{.State.Health.Status}}' "$application")
    if [[ "$health" == healthy || "$health" == unhealthy ]]; then break; fi
    sleep 2
done
[[ "$health" == healthy ]] || { echo 'Image did not become ready.' >&2; exit 1; }
[[ "$(docker exec "$application" id -u)" == 10001 ]]
[[ "$(docker exec "$application" id -g)" == 10001 ]]
[[ "$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image")" == "$revision" ]]
docker exec "$application" dotnet NetFilmx_Web.dll smokecheck
docker exec "$application" ffmpeg -nostdin -v error -f lavfi -i testsrc2=size=64x64:rate=1 \
    -t 1 -c:v libx264 -threads 1 -y /tmp/netfilmx-image-test.mp4
docker exec "$application" ffprobe -v error -select_streams v:0 -show_entries stream=codec_name \
    -of default=noprint_wrappers=1:nokey=1 /tmp/netfilmx-image-test.mp4
# The health command embeds its own revision; the label check above compares
# that image to the requested SHA. Shutdown/restart also exercises key persistence.
docker restart --time 25 "$application" >/dev/null
for _ in {1..40}; do
    health=$(docker inspect --format '{{.State.Health.Status}}' "$application")
    if [[ "$health" == healthy ]]; then break; fi
    sleep 2
done
[[ "$health" == healthy ]]
docker exec "$application" dotnet NetFilmx_Web.dll smokecheck
[[ "$(snapshot)" == "$initial_catalogue" ]]
echo 'Exact image, catalogue, native media tools and restart smoke passed.'
