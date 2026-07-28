#!/bin/bash
set -euo pipefail

APP_NAME="netfilmx-movie-catalog"
CONTAINER_NAME="netfilmx"
NETWORK_NAME="netfilmx-network"
NPM_CONTAINER="nginx-proxy-manager"
IMAGE_TAG="${APP_NAME}:latest"
APP_DIR="/home/netfilmx/app"

# Build image
docker build -t "$IMAGE_TAG" -f "$APP_DIR/infra/Dockerfile" "$APP_DIR"

# Ensure dedicated network exists & connect NPM
docker network create "$NETWORK_NAME" 2>/dev/null || true
docker network connect "$NETWORK_NAME" "$NPM_CONTAINER" 2>/dev/null || true

# Stop and remove old container
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# Ensure data directory exists and has permissions
mkdir -p "$APP_DIR/data"
chmod 777 "$APP_DIR/data"

# Run new container on dedicated network
docker run -d \
  --name "$CONTAINER_NAME" \
  --network "$NETWORK_NAME" \
  --restart unless-stopped \
  --memory 512m \
  --cpus 0.5 \
  --env-file "$APP_DIR/.env" \
  -v "${APP_DIR}/data:/app/data" \
  "$IMAGE_TAG"

# Cleanup dangling images
docker image prune -f

echo "Waiting for container to start..."
sleep 5

echo "Running health check..."
for i in {1..3}; do
  if docker run --network "$NETWORK_NAME" --rm curlimages/curl -fsS --max-time 5 http://netfilmx:8080 >/dev/null 2>&1; then
    echo "✅ Health check OK"
    echo "✅ $APP_NAME deployed successfully on network $NETWORK_NAME"
    exit 0
  fi
  echo "Attempt $i failed, retrying in 5s..."
  sleep 5
done

echo "❌ Health check failed! Container logs:"
docker logs "$CONTAINER_NAME" --tail 100
exit 1
