# FÊNIX Ω∞ — DEPLOY EXECUTION (Main → VPS)

Comandos exatos para o dono executar na VPS. **O agente NÃO executa nada aqui** — nem SSH,
nem docker, nem install. Cada comando foi derivado da realidade medida da VPS, não assumido.

## Realidade medida da VPS (base destes comandos)

- Stack viva: `grg-fenix-enterprise-*`, usuário `fenix`, docker rootless.
- Roda de: `/opt/grg-fenix/source/grg`, arquivo `docker-compose.enterprise.yml`.
- Imagem: `grg/fenix:${FENIX_VERSION:-1.0.0-rc.1}`, **`build: .`** (constrói do source local).
- Config da app: bloco `environment:` inline (âncora `&fenix-environment`) — **não** há
  `.env.production`; o `.env` do dir só tem variáveis de interpolação do compose.
- Código atual: `main @ 38bbde3` (v24). Após o merge, `origin/main` está em `24b4594c` (v31).
- Remote da VPS: push DISABLED (só fetch/pull) — ok, o deploy é pull, não push.

## Sequência (execute como `fenix`, ou via `sudo -u fenix`)

Prefixo do docker rootless (a stack usa isto):
```bash
export FUID=$(id -u fenix)
export XDG_RUNTIME_DIR=/run/user/$FUID
export DOCKER_HOST=unix:///run/user/$FUID/docker.sock
cd /opt/grg-fenix/source/grg
```

### 1. BACKUP (a linha de retorno — antes de tudo)
```bash
docker exec grg-fenix-enterprise-postgres-1 pg_dump -U fenix fenix | gzip > /opt/grg-fenix/backups/pre-v31-$(date +%Y%m%d-%H%M%S).sql.gz
ls -lh /opt/grg-fenix/backups/ | tail -1     # confirmar que o dump tem tamanho > 0
```

### 2. TRAZER O CÓDIGO v31 (Main → source da VPS)
```bash
cd /opt/grg-fenix/source
git fetch origin
git log --oneline -1 origin/main            # deve mostrar 24b4594c
git checkout main && git pull --ff-only origin main
grep -m1 CURRENT_SCHEMA_VERSION grg/src/kernel/state-migrations.js   # deve dizer 31
```

### 3. BUILD da imagem v31
```bash
cd /opt/grg-fenix/source/grg
docker compose -f docker-compose.enterprise.yml build api
```

### 4. UP (recria; migrateState roda v24→v31 no boot)
```bash
docker compose -f docker-compose.enterprise.yml up -d
docker compose -f docker-compose.enterprise.yml ps       # todos Up/healthy?
```

### 5. CONFIRMAR o boot e a migração
```bash
docker logs grg-fenix-enterprise-api-1 --tail 40 | grep -iE "schema|migrat|listen|ready"
curl -s http://127.0.0.1:4400/health | head -c 300       # {"ok":true,"status":"ready"}
```

## Smoke tests (FASE 5 — traga a saída destes para mim)

```bash
# 1. health com checks criticos
curl -s http://127.0.0.1:4400/health
# 2. identidade do organismo (RC1) — schema 31 na linhagem
curl -s -H "Authorization: Bearer $FENIX_API_TOKEN" http://127.0.0.1:4400/api/organism/identity
# 3. conectores com estado derivado (RC1)
curl -s -H "Authorization: Bearer $FENIX_API_TOKEN" http://127.0.0.1:4400/api/connectors
# 4. AI router seleciona por evidencia (RC1)
curl -s -H "Authorization: Bearer $FENIX_API_TOKEN" http://127.0.0.1:4400/api/ai/router/select
# 5. runtime permanente vivo
node scripts/runtime-roles.js
# 6. dashboard responde
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4400/app
```

Para o token: `export FENIX_API_TOKEN=...` (bearer com security:manage — ver GO_LIVE_RUNBOOK §4).

## Se algo falhar → ROLLBACK (ver ROLLBACK.md)

```bash
cd /opt/grg-fenix/source && git checkout 38bbde3
cd grg && docker compose -f docker-compose.enterprise.yml up -d --build
curl -s http://127.0.0.1:4400/health        # confirmar v24 de volta
```
A migração é aditiva; o código v24 ignora as coleções novas — rollback de código basta na
maioria dos casos. Rollback de dado (restore do dump do passo 1) só se necessário.

## Depois que você rodar

Traga para mim a saída dos 6 smoke tests + o `docker compose ps`. Eu interpreto os logs,
valido health/mission/router/connectors, e escrevo o `POST_DEPLOY_REPORT.md` (FASE 5) com
evidência real — sucesso, falhas, rollback necessário ou não, próximos passos.

## Fronteira

O agente parou aqui, na entrega dos comandos. Não conectou por SSH para deploy, não recriou
a stack, não tocou produção. A execução é sua — recriar uma stack viva e saudável é ação
irreversível que exige sua mão, como a missão definiu.
