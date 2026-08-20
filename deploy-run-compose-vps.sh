#!/usr/bin/env bash
set -euo pipefail

cd /opt/grg-fenix/source/grg

FUID="$(id -u)"
export XDG_RUNTIME_DIR="/run/user/$FUID"
export DOCKER_HOST="unix:///run/user/$FUID/docker.sock"

COMPOSE_ENV=()
if [ -f .env.production ]; then
  COMPOSE_ENV=(--env-file .env.production)
fi

docker compose "${COMPOSE_ENV[@]}" -f docker-compose.enterprise.yml build api
docker compose "${COMPOSE_ENV[@]}" -f docker-compose.enterprise.yml up -d api worker
docker compose "${COMPOSE_ENV[@]}" -f docker-compose.enterprise.yml ps
