# LEVEL1_DEPLOYMENT_PLAN — FÊNIX OS

Data: 2026-11-10. **Nenhum deploy foi feito.** Este plano é para o proprietário executar (ou autorizar explicitamente) depois da rotação de segredos.

## 0. Achado que muda o plano

O `docker-compose.enterprise.yml` do repositório **já define `FENIX_ENV: production`** para api e worker (âncora `&fenix-environment`, linha 10). Mesmo assim, a produção respondeu em 2026-11-10 `"environment":"development"` no `/health` — e o servidor tira esse campo de `FENIX_ENV`/`NODE_ENV`. Portanto **o que roda na VPS diverge do repositório** (compose antigo, override no `.env.production`, ou processo fora do compose). Isso precisa ser explicado antes do deploy.

## 1. Pré-checagens na VPS (somente leitura)

```bash
# no host, como o usuário do docker rootless (ver nota de operação da VPS)
docker ps --format '{{.Names}} {{.Image}} {{.Status}}'
docker exec grg-fenix-enterprise-api-1 printenv FENIX_ENV NODE_ENV
grep -n 'FENIX_ENV\|NODE_ENV\|FENIX_VERSION' /opt/grg-fenix/source/grg/.env.production
diff <(sed -n 1,40p /opt/grg-fenix/source/grg/docker-compose.enterprise.yml) <(sed -n 1,40p <compose do repo>)
```
Critério: entender por que o container não está em `production`.

## 2. Bloqueadores de boot introduzidos pelo LEVEL 1 (verificar ANTES)

| Mudança | Efeito em produção | Verificação |
|---|---|---|
| Bootstrap exige senha forte em produção (≥ 16 caracteres, diferente do usuário) | se `FENIX_BOOTSTRAP_ADMIN_PASSWORD` for fraca, o **api não sobe** | conferir comprimento da variável (sem exibir) |
| Bootstrap sem valor padrão | se só um de `FENIX_BOOTSTRAP_ADMIN_USER`/`PASSWORD` estiver definido, o api não sobe | conferir as duas |
| Produção recusa provedor `echo` (`app.js:162-168`, já existia) | ao virar `production` de verdade, o api **não sobe** se alguma rota de IA usar `echo` | definir `FENIX_AI_DEFAULT_PROVIDER` para um provedor real (ex.: `ollama`) |
| Cofre fail-closed | conexões que dependem do cofre falham até `FENIX_VAULT_KEY` existir | definir `FENIX_VAULT_KEY` e incluí-la na allowlist do compose (variável fora do compose não chega ao container) |
| Sessão de preview desligada | `/api/v2/preview/dev-session` → 404 | nenhum uso no frontend (verificado) |
| `/health` resumido para anônimos | monitor externo que lia detalhes passa a ver só `ok/status` | healthcheck do compose usa `/api/system/boot-status` (inalterado) |
| Gate central de escrita | viewer/employee não fazem POST/PUT/PATCH/DELETE | confirmar papéis dos usuários reais |

## 3. Passos de deploy (receita já usada no projeto)

1. Rotação concluída (`LEVEL1_SECRET_ROTATION_CHECKLIST.md`).
2. Commit das mudanças do LEVEL 1 em branch própria (o proprietário decide; nada foi commitado).
3. Empacotar `src test public ops docker-compose.enterprise.yml package.json Dockerfile` **sem** `.env*` e **sem** `.secrets/`.
4. Na VPS: backup do `.env.production` e `pg_dump` de `fenix.kernel_state`.
5. Ajustar `.env.production`: `FENIX_ENV=production` (remover override se houver), `FENIX_VAULT_KEY`, provedor de IA real, nova senha forte de bootstrap.
6. `docker build` com nova tag; atualizar `FENIX_VERSION` no `.env.production` (deixar a anterior comentada para rollback).
7. `docker compose --env-file .env.production up -d --no-deps api worker`.

## 4. Verificação pós-deploy (sem login, a partir de fora)

| Checagem | Esperado |
|---|---|
| `curl https://<host>/health` | só `ok`, `status`, `service`, `checkedAt` (sem `environment`, sem `checks`) |
| `curl -X POST https://<host>/api/v2/preview/dev-session` | 404 |
| `curl https://<host>/index_frozen_backup.html` e `/fenix-world-3d.js.bak` | 404 |
| `curl -X POST https://<host>/api/v2/reality-operator/terminal/exec` | 401 |
| Login com senha trivial do admin | 403 |

Com login (proprietário): `/health` autenticado mostra `"environment":"production"` e nenhum provedor `echo`.

## 5. Rollback

Voltar `FENIX_VERSION` para a tag anterior no `.env.production` e `docker compose up -d --no-deps api worker`. O LEVEL 1 não altera esquema de banco.

## 6. Observação sobre o CLAUDE.md

A Regra V manda fazer deploy por `deploy.bat`, mas `ai-engine/deploy.bat` e `ecosystem.config.js` estão desativados e a produção usa Docker. O CLAUDE.md não foi alterado no LEVEL 1 (fora do escopo de segurança); corrigir no LEVEL 2.