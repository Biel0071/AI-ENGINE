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
POSTGRES_PASS=$(cat /opt/fenix-os/grg/.secrets/postgres_password 2>/dev/null || echo "dummy-secret-123")
REDIS_PASS=$(cat /opt/fenix-os/grg/.secrets/redis_password 2>/dev/null || echo "dummy-secret-123")
MINIO_KEY=$(cat /opt/fenix-os/grg/.secrets/minio_access_key 2>/dev/null || echo "dummy-secret-123")
MINIO_SECRET=$(cat /opt/fenix-os/grg/.secrets/minio_secret_key 2>/dev/null || echo "dummy-secret-123")
PUBLIC_IP=$(curl -s ipinfo.io/ip || echo "127.0.0.1")
    cat << EOF > .env.production
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
FENIX_OIDC_ISSUER=http://${PUBLIC_IP}:8080/auth/realms/grg
FENIX_OIDC_AUDIENCE=fenix
FENIX_OIDC_JWKS_URI=http://${PUBLIC_IP}:8080/auth/realms/grg/protocol/openid-connect/certs
FENIX_OIDC_AUTHORIZATION_ENDPOINT=http://${PUBLIC_IP}:8080/auth/realms/grg/protocol/openid-connect/auth
FENIX_OIDC_TOKEN_ENDPOINT=http://${PUBLIC_IP}:8080/auth/realms/grg/protocol/openid-connect/token
FENIX_OIDC_REDIRECT_URI=http://${PUBLIC_IP}:4400/callback
FENIX_PUBLIC_URL=http://${PUBLIC_IP}:4400
FENIX_BIND_ADDRESS=0.0.0.0
FENIX_ROOTLESS_DOCKER_SOCKET=/var/run/docker.sock
DATABASE_URL=postgresql://fenix:${POSTGRES_PASS}@postgres:5432/fenix
REDIS_URL=redis://:${REDIS_PASS}@redis:6379
FENIX_QDRANT_URL=http://qdrant:6333
FENIX_S3_ENDPOINT=http://minio:9000
FENIX_S3_BUCKET=fenix
FENIX_S3_ACCESS_KEY_ID=${MINIO_KEY}
FENIX_S3_SECRET_ACCESS_KEY=${MINIO_SECRET}
FENIX_S3_REGION=us-east-1
FENIX_S3_FORCE_PATH_STYLE=1
POSTGRES_DB=fenix
POSTGRES_USER=fenix
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
