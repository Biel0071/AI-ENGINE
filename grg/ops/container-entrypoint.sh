#!/usr/bin/env sh
set -eu
read_secret() { test -r "$1" || { echo "missing secret file: $1" >&2; exit 1; }; tr -d '\r\n' < "$1"; }
POSTGRES_PASSWORD="$(read_secret /run/secrets/postgres_password)"
REDIS_PASSWORD="$(read_secret /run/secrets/redis_password)"
export DATABASE_URL="postgresql://${POSTGRES_USER:-fenix}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-fenix}"
export REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379/0"
export FENIX_QUEUE_REDIS_URL="$REDIS_URL"
export FENIX_S3_ACCESS_KEY_ID="$(read_secret /run/secrets/minio_access_key)"
export FENIX_S3_SECRET_ACCESS_KEY="$(read_secret /run/secrets/minio_secret_key)"
AI_PROVIDER_KEY="$(read_secret /run/secrets/ai_provider_key)"
case "${FENIX_AI_DEFAULT_PROVIDER:-}" in
  openai) export OPENAI_API_KEY="$AI_PROVIDER_KEY" ;;
  groq) export GROQ_API_KEY="$AI_PROVIDER_KEY" ;;
  local) export FENIX_OPENAI_COMPATIBLE_KEY="$AI_PROVIDER_KEY" ;;
  aiplatform) export GRG_AIPLATFORM_KEY="$AI_PROVIDER_KEY" ;;
  *) echo "unsupported FENIX_AI_DEFAULT_PROVIDER" >&2; exit 1 ;;
esac
exec "$@"
