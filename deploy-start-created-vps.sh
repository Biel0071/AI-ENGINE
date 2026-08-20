#!/usr/bin/env bash
set -euo pipefail

FUID="$(id -u)"
export XDG_RUNTIME_DIR="/run/user/$FUID"
export DOCKER_HOST="unix:///run/user/$FUID/docker.sock"

docker start grg-fenix-enterprise-api-1 || true
sleep 12
docker start grg-fenix-enterprise-worker-1 || true
sleep 8
docker ps -a --format 'table {{.Names}}\t{{.Status}}' | grep grg-fenix || true
echo '--- api logs ---'
docker logs grg-fenix-enterprise-api-1 --tail 120 || true
echo '--- worker logs ---'
docker logs grg-fenix-enterprise-worker-1 --tail 80 || true
