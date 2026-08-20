#!/usr/bin/env bash
set -euo pipefail

ZIP_PATH="${1:-/tmp/fenix-unified-public.zip}"
APP_DIR="/opt/grg-fenix/source/grg"
WORK_DIR="/tmp/fenix-unified-public"

rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"
unzip -oq "$ZIP_PATH" -d "$WORK_DIR"

cd "$APP_DIR"
cp "$WORK_DIR/grg/public/index.html" public/index.html
cp "$WORK_DIR/grg/public/login.html" public/login.html
cp "$WORK_DIR/grg/public/unified.css" public/unified.css
cp "$WORK_DIR/grg/public/unified-app.js" public/unified-app.js
cp "$WORK_DIR/grg/src/server.js" src/server.js
cp "$WORK_DIR/grg/src/app.js" src/app.js
cp "$WORK_DIR/grg/src/agents/agent-swarm.js" src/agents/agent-swarm.js
mkdir -p src/skills skills/fenix-operational-routing skills/frontend-click-qa
cp "$WORK_DIR/grg/src/skills/skill-registry.js" src/skills/skill-registry.js
cp "$WORK_DIR/grg/skill-global" skill-global
cp "$WORK_DIR/grg/skills/fenix-operational-routing/SKILL.md" skills/fenix-operational-routing/SKILL.md
cp "$WORK_DIR/grg/skills/frontend-click-qa/SKILL.md" skills/frontend-click-qa/SKILL.md
mkdir -p ../.agents ../.codex ../.claude
cp -R "$WORK_DIR/.agents/skills" ../.agents/
cp -R "$WORK_DIR/.codex/skills" ../.codex/
cp -R "$WORK_DIR/.claude/skills" ../.claude/
cp "$WORK_DIR/skill-global" ../skill-global

set -a
[ -f .env ] && . ./.env
set +a

FUID="$(id -u)"
export XDG_RUNTIME_DIR="/run/user/$FUID"
export DOCKER_HOST="unix:///run/user/$FUID/docker.sock"

echo "source_head=$(git rev-parse --short HEAD)"
docker compose -f docker-compose.enterprise.yml build api
docker compose -f docker-compose.enterprise.yml up -d api worker
docker compose -f docker-compose.enterprise.yml ps
curl -fsS http://127.0.0.1:4400/health | head -c 500
echo
curl -fsS -o /dev/null -w "app_http=%{http_code}\n" http://127.0.0.1:4400/app
