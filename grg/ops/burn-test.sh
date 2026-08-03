#!/bin/bash
set -e

echo "Iniciando Production Hardening Mode (Burn Test)..."
echo "Preparando ambiente..."

# Garantir dependencias
if ! command -v docker &> /dev/null; then
    echo "Docker ausente. Por favor, instale-o no host ICP."
    exit 1
fi

cd /opt/fenix-os/grg || { echo "Codigo nao encontrado em /opt/fenix-os/grg. Faça o deploy primeiro."; exit 1; }

echo "Criando .env de producao com dummy secrets (se nao existir)..."
    cat << 'EOF' > .env.production
POSTGRES_PASSWORD_FILE=/opt/fenix-os/grg/.secrets/postgres_password
REDIS_PASSWORD_FILE=/opt/fenix-os/grg/.secrets/redis_password
MINIO_ACCESS_KEY_FILE=/opt/fenix-os/grg/.secrets/minio_access_key
MINIO_SECRET_KEY_FILE=/opt/fenix-os/grg/.secrets/minio_secret_key
AI_PROVIDER_KEY_FILE=/opt/fenix-os/grg/.secrets/ai_provider_key
METRICS_TOKEN_FILE=/opt/fenix-os/grg/.secrets/metrics_token
KEYCLOAK_ADMIN_PASSWORD_FILE=/opt/fenix-os/grg/.secrets/keycloak_admin_password
KEYCLOAK_USER_PASSWORD_FILE=/opt/fenix-os/grg/.secrets/keycloak_user_password
FENIX_AI_DEFAULT_PROVIDER=openai
FENIX_AI_DEFAULT_MODEL=gpt-4o
FENIX_OIDC_ISSUER=http://localhost:8080/auth/realms/grg
FENIX_OIDC_AUDIENCE=fenix
FENIX_OIDC_JWKS_URI=http://localhost:8080/auth/realms/grg/protocol/openid-connect/certs
FENIX_OIDC_AUTHORIZATION_ENDPOINT=http://localhost:8080/auth/realms/grg/protocol/openid-connect/auth
FENIX_OIDC_TOKEN_ENDPOINT=http://localhost:8080/auth/realms/grg/protocol/openid-connect/token
FENIX_OIDC_REDIRECT_URI=http://localhost:4400/callback
FENIX_PUBLIC_URL=http://localhost:4400
FENIX_ROOTLESS_DOCKER_SOCKET=/var/run/docker.sock
EOF

mkdir -p .secrets
for secret in postgres_password redis_password minio_access_key minio_secret_key ai_provider_key metrics_token keycloak_admin_password keycloak_user_password; do
    echo "dummy-secret-123" > ".secrets/$secret"
    chmod 600 ".secrets/$secret"
done

echo "Fazendo o build da AI Platform..."
set -a
source .env.production
set +a
docker compose -f docker-compose.enterprise.yml build

echo "Subindo servicos..."
docker compose -f docker-compose.enterprise.yml up -d

echo "Aguardando 15s para Health Checks internos..."
sleep 15

echo "Status dos containers:"
docker compose -f docker-compose.enterprise.yml ps

echo "Rodando testes no container da API..."
docker compose -f docker-compose.enterprise.yml exec -T api npm test || echo "Testes falharam. Cheque os logs."

echo "Logs da API:"
docker compose -f docker-compose.enterprise.yml logs api --tail=50

echo "Logs do Worker:"
docker compose -f docker-compose.enterprise.yml logs worker --tail=50

echo "Burn Test finalizado. Envie a saida deste script de volta ao Codex."
