#!/usr/bin/env sh
set -eu

read_secret() {
  test -r "$1" || { echo "missing secret file: $1" >&2; exit 1; }
  tr -d '\r\n' < "$1"
}

POSTGRES_PASSWORD="$(read_secret /run/secrets/postgres_password)"
REDIS_PASSWORD="$(read_secret /run/secrets/redis_password)"
export FENIX_S3_ACCESS_KEY_ID="$(read_secret /run/secrets/minio_access_key)"
export FENIX_S3_SECRET_ACCESS_KEY="$(read_secret /run/secrets/minio_secret_key)"
export FENIX_METRICS_TOKEN="$(read_secret /run/secrets/metrics_token)"

export DATABASE_URL="${DATABASE_URL:-postgresql://${POSTGRES_USER:-fenix}:${POSTGRES_PASSWORD}@${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-fenix}?schema=${FENIX_DATABASE_SCHEMA:-fenix}}"
export REDIS_URL="${REDIS_URL:-redis://:${REDIS_PASSWORD}@${REDIS_HOST:-redis}:${REDIS_PORT:-6379}}"
export FENIX_QUEUE_REDIS_URL="${FENIX_QUEUE_REDIS_URL:-$REDIS_URL}"

# Provider keys are mounted as secrets. The mounted value wins; disagreement with .env is reported
# without printing either value, because silent precedence caused production 401s in the past.
AI_PROVIDER_KEY=''
if [ -r /run/secrets/ai_provider_key ]; then
  AI_PROVIDER_KEY="$(read_secret /run/secrets/ai_provider_key)"
fi
avisar_divergencia() {
  nome="$1"
  doEnv="$2"
  if [ -n "$doEnv" ] && [ -n "$AI_PROVIDER_KEY" ] && [ "$doEnv" != "$AI_PROVIDER_KEY" ]; then
    echo "aviso: $nome do ambiente difere de /run/secrets/ai_provider_key; o segredo montado prevalece" >&2
  fi
}
require_key() {
  test -n "$AI_PROVIDER_KEY" || {
    echo "FENIX_AI_DEFAULT_PROVIDER=$1 requires /run/secrets/ai_provider_key" >&2
    exit 1
  }
}
case "${FENIX_AI_DEFAULT_PROVIDER:-}" in
  openai) require_key openai; avisar_divergencia OPENAI_API_KEY "${OPENAI_API_KEY:-}"; export OPENAI_API_KEY="$AI_PROVIDER_KEY" ;;
  codex) require_key codex; avisar_divergencia FENIX_CODEX_API_KEY "${FENIX_CODEX_API_KEY:-}"; export FENIX_CODEX_API_KEY="$AI_PROVIDER_KEY"; export FENIX_ENABLE_CODEX=1 ;;
  groq) require_key groq; avisar_divergencia GROQ_API_KEY "${GROQ_API_KEY:-}"; export GROQ_API_KEY="$AI_PROVIDER_KEY" ;;
  anthropic) require_key anthropic; avisar_divergencia ANTHROPIC_API_KEY "${ANTHROPIC_API_KEY:-}"; export ANTHROPIC_API_KEY="$AI_PROVIDER_KEY" ;;
  gemini) require_key gemini; avisar_divergencia GEMINI_API_KEY "${GEMINI_API_KEY:-}"; export GEMINI_API_KEY="$AI_PROVIDER_KEY" ;;
  local) require_key local; avisar_divergencia FENIX_OPENAI_COMPATIBLE_KEY "${FENIX_OPENAI_COMPATIBLE_KEY:-}"; export FENIX_OPENAI_COMPATIBLE_KEY="$AI_PROVIDER_KEY" ;;
  aiplatform) require_key aiplatform; avisar_divergencia GRG_AIPLATFORM_KEY "${GRG_AIPLATFORM_KEY:-}"; export GRG_AIPLATFORM_KEY="$AI_PROVIDER_KEY" ;;
  ollama)
    test -n "${FENIX_OLLAMA_URL:-}${GRG_OLLAMA_DIRECT_URL:-}" || {
      echo "FENIX_AI_DEFAULT_PROVIDER=ollama requires FENIX_OLLAMA_URL" >&2
      exit 1
    }
    export FENIX_ENABLE_OLLAMA=1
    ;;
  "") echo "FENIX_AI_DEFAULT_PROVIDER is required" >&2; exit 1 ;;
  *) echo "unsupported FENIX_AI_DEFAULT_PROVIDER: ${FENIX_AI_DEFAULT_PROVIDER}" >&2; exit 1 ;;
esac
exec "$@"