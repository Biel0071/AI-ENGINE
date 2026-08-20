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

stamp="$(date +%Y%m%d-%H%M%S)"
docker compose "${COMPOSE_ENV[@]}" -f docker-compose.enterprise.yml stop qdrant || true
volume="$(docker inspect grg-fenix-enterprise-qdrant-1 --format '{{range .Mounts}}{{if eq .Destination "/qdrant/storage"}}{{.Name}}{{end}}{{end}}')"
if [ -z "$volume" ]; then
  echo "qdrant volume not found"
  exit 1
fi
echo "volume=$volume"

docker run --rm -v "$volume:/qdrant-storage" alpine sh -c "
  set -e
  cd /qdrant-storage
  mkdir -p /qdrant-storage/recovery-backups
  if [ -d collections/fenix_memory ]; then
    tar -czf recovery-backups/fenix_memory-$stamp.tar.gz collections/fenix_memory
    mv collections/fenix_memory collections/fenix_memory.bak-$stamp
    echo backup=recovery-backups/fenix_memory-$stamp.tar.gz
  else
    echo no_existing_collection
  fi
"

docker compose "${COMPOSE_ENV[@]}" -f docker-compose.enterprise.yml up -d qdrant
sleep 20
docker ps -a --format 'table {{.Names}}\t{{.Status}}' | grep grg-fenix || true
docker logs grg-fenix-enterprise-qdrant-1 --tail 80 || true
