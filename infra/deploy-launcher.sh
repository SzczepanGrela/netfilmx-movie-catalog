#!/bin/bash
set -euo pipefail
cd /home/netfilmx/app
git fetch origin main
git reset --hard origin/main
exec bash infra/deploy.sh
