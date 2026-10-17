#!/usr/bin/env bash
set -euo pipefail
image=${1:?Supply the exact image reference}
revision=${2:?Supply the full source revision}
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || exit 64
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
    --cpus 1 --memory 512m --pids-limit 128 \
    --tmpfs /var/lib/postgresql/data:rw,nosuid,nodev,size=384m \
    --env POSTGRES_USER=netfilmx_test --env POSTGRES_PASSWORD=local-image-test \
    --env POSTGRES_DB=netfilmx_test \
    postgres@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea >/dev/null
database_created=true
for _ in {1..30}; do
    if docker exec "$database" pg_isready -U netfilmx_test -d netfilmx_test >/dev/null; then break; fi
    sleep 1
done
connection='Host=database;Database=netfilmx_test;Username=netfilmx_test;Password=local-image-test'
docker run --rm --network "$network" --cpus 1 --memory 512m --cap-drop ALL --init \
    --env "ConnectionStrings__DefaultConnection=$connection" "$image" \
    database migrate --confirm-reviewed-migrations
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
echo 'Exact image, catalogue, native media tools and restart smoke passed.'
