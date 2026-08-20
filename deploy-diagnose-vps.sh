#!/usr/bin/env bash
set -euo pipefail

FUID="$(id -u)"
export XDG_RUNTIME_DIR="/run/user/$FUID"
export DOCKER_HOST="unix:///run/user/$FUID/docker.sock"
cd /opt/grg-fenix/source/grg

docker ps -a --format 'table {{.Names}}\t{{.Status}}' | grep grg-fenix || true
echo '--- qdrant logs ---'
docker logs grg-fenix-enterprise-qdrant-1 --tail 100 || true
echo '--- api logs ---'
docker logs grg-fenix-enterprise-api-1 --tail 100 || true
echo '--- worker logs ---'
docker logs grg-fenix-enterprise-worker-1 --tail 80 || true
