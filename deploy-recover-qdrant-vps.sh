#!/usr/bin/env bash
set -euo pipefail

FUID="$(id -u)"
export XDG_RUNTIME_DIR="/run/user/$FUID"
export DOCKER_HOST="unix:///run/user/$FUID/docker.sock"
cd /opt/grg-fenix/source/grg

COMPOSE_ENV=()
if [ -f .env.production ]; then
  COMPOSE_ENV=(--env-file .env.production)
fi

docker compose "${COMPOSE_ENV[@]}" -f docker-compose.enterprise.yml stop qdrant || true
sleep 8
docker compose "${COMPOSE_ENV[@]}" -f docker-compose.enterprise.yml up -d qdrant
sleep 15
docker ps -a --format 'table {{.Names}}\t{{.Status}}' | grep grg-fenix || true
docker logs grg-fenix-enterprise-qdrant-1 --tail 80 || true
