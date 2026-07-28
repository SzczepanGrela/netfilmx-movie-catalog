#!/bin/bash
set -euo pipefail

APP_NAME="netfilmx-movie-catalog"
CONTAINER_NAME="netfilmx-app"
NETWORK_NAME="netfilmx-network"
NPM_CONTAINER="nginx-proxy-manager"
IMAGE_TAG="${APP_NAME}:latest"
APP_DIR="/home/netfilmx-app/app"

# Build image
docker build -t "$IMAGE_TAG" -f "$APP_DIR/infra/Dockerfile" "$APP_DIR"

# Ensure dedicated network exists & connect NPM
docker network create "$NETWORK_NAME" 2>/dev/null || true
docker network connect "$NETWORK_NAME" "$NPM_CONTAINER" 2>/dev/null || true

# Stop and remove old container
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

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
echo "✅ $APP_NAME deployed successfully on network $NETWORK_NAME"
