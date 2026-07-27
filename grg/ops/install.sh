#!/usr/bin/env sh
set -eu
. "$(dirname "$0")/common.sh"
require_command docker; require_command openssl; require_command curl
docker compose version >/dev/null
test "$(uname -s)" = Linux || { echo 'Only Linux VPS installations are supported.' >&2; exit 1; }
: "${FENIX_AI_DEFAULT_PROVIDER:?set FENIX_AI_DEFAULT_PROVIDER (openai, groq, local or aiplatform)}"
: "${FENIX_AI_DEFAULT_MODEL:?set FENIX_AI_DEFAULT_MODEL}"
: "${AI_PROVIDER_KEY:?supply AI_PROVIDER_KEY from your external provider}"
: "${DOCKER_HOST:?rootless DOCKER_HOST must be configured, for example unix:///run/user/1000/docker.sock}"
SECRETS_DIR=${FENIX_SECRETS_DIR:-/var/lib/grg-fenix/secrets}
sudo install -d -m 0700 "$SECRETS_DIR"
generate() { file="$1"; if ! sudo test -s "$file"; then openssl rand -base64 48 | sudo tee "$file" >/dev/null; sudo chmod 0600 "$file"; fi; }
generate "$SECRETS_DIR/postgres_password"; generate "$SECRETS_DIR/redis_password"; generate "$SECRETS_DIR/minio_access_key"; generate "$SECRETS_DIR/minio_secret_key"
printf '%s' "$AI_PROVIDER_KEY" | sudo tee "$SECRETS_DIR/ai_provider_key" >/dev/null; sudo chmod 0600 "$SECRETS_DIR/ai_provider_key"
umask 077
{
  echo "POSTGRES_PASSWORD_FILE=$SECRETS_DIR/postgres_password"; echo "REDIS_PASSWORD_FILE=$SECRETS_DIR/redis_password"
  echo "MINIO_ACCESS_KEY_FILE=$SECRETS_DIR/minio_access_key"; echo "MINIO_SECRET_KEY_FILE=$SECRETS_DIR/minio_secret_key"; echo "AI_PROVIDER_KEY_FILE=$SECRETS_DIR/ai_provider_key"
  echo "FENIX_AI_DEFAULT_PROVIDER=$FENIX_AI_DEFAULT_PROVIDER"; echo "FENIX_AI_DEFAULT_MODEL=$FENIX_AI_DEFAULT_MODEL"
  echo "FENIX_OPENAI_COMPATIBLE_URL=${FENIX_OPENAI_COMPATIBLE_URL:-}"; echo "OPENAI_BASE_URL=${OPENAI_BASE_URL:-}"; echo "GROQ_BASE_URL=${GROQ_BASE_URL:-}"
  echo "FENIX_ROOTLESS_DOCKER_SOCKET=${DOCKER_HOST#unix://}"
} > "$FENIX_DIR/.env.production"
compose build --pull api
compose up -d --remove-orphans
"$OPS_DIR/healthcheck.sh"
echo 'GRG FENIX installation completed. Reverse proxy/TLS and OIDC must be configured before public exposure.'
