# LEVEL1_SECRET_ROTATION_CHECKLIST — FÊNIX OS

Data: 2026-11-10. **Nenhum valor secreto aparece neste documento.** Nenhuma credencial foi trocada pelo Claude: a rotação é do proprietário.

> Tirar um arquivo do git **não** invalida a credencial. Tudo que esteve versionado ou em texto puro deve ser tratado como comprometido.

## 1. Inventário

| # | Segredo | Onde estava | Exposição | Ação do proprietário | Prioridade |
|---|---|---|---|---|---|
| 1 | Senha do usuário `grg-admin` (e qualquer usuário `admin`) | backdoor em `grg/src/auth/auth.js` (removido) | **qualquer pessoa** podia entrar com senha trivial e o backdoor **regravava o hash**: a senha atual pode ter sido trocada por um terceiro | trocar a senha; revogar todas as sessões (`UPDATE` em `sessions.revokedAt` no `kernel_state` ou reinício com `FENIX_BOOTSTRAP_ADMIN_PASSWORD` novo — o bootstrap revoga sessões ao trocar a senha); revisar `auditEvents` de `auth.login` | **P0 imediato** |
| 2 | Chave do provedor de IA | `grg/.secrets/ai_provider_key` (versionado, commit `58a934c9`) e `ai-engine/.secrets/ai_provider_key` (não versionado) | histórico git | revogar no painel do provedor e emitir nova; colocar só no `.secrets/` da VPS | **P0** |
| 3 | Chave do cofre (`FENIX_VAULT_KEY`) e conteúdo do cofre | `grg/memory/.secrets-vault.json` (versionado) cifrado com chave fixa do código | qualquer cópia do repositório decifrava | definir `FENIX_VAULT_KEY` (≥ 16 chars, aleatória); revogar a chave OpenAI que estava no cofre; recadastrar conexões (o cofre agora recusa operar sem a chave) | **P0** |
| 4 | Senhas de Postgres, Redis, Keycloak (admin e usuário), MinIO (access/secret), token de métricas | `grg/.secrets/*` (7 arquivos de 7 bytes, versionados) | histórico git; tamanho sugere placeholders, **não confirmado** | se forem as mesmas da VPS: trocar todas; se forem placeholders: confirmar e registrar | P1 |
| 5 | Senha de admin em `grg/diag.sh` | linha 9 (versionado) | histórico git | coberta pelo item 1; o script agora lê `FENIX_DIAG_PASSWORD` | P0 (via item 1) |
| 6 | `DATABASE_URL` com senha do Postgres | `C:\projetos\ai-engine-core\.env.production` (fora do git) | disco local em pasta de rascunhos | trocar senha do banco; manter só na VPS | P1 |
| 7 | Senha do banco em scripts | `C:\projetos\ai-engine-core\update_vps_env.sh`, `test_pg.js`, `inspect_users.js`, `inspect_user_passwords.js` (fora do git) | disco local | apagar os scripts após a troca | P1 |
| 8 | Chaves S3/MinIO | `C:\projetos\ai-engine-core\update_pm2_env.sh` (fora do git) | disco local | trocar no MinIO; apagar o script | P1 |
| 9 | Senhas de login em JSON | `C:\projetos\ai-engine-core\login_admin.json`, `login_payload.json` (fora do git) | disco local | apagar; cobertas pelo item 1 | P1 |
| 10 | Senha root da VPS | registrada em memória de sessão anterior como "colada no chat" | conversa anterior | trocar; manter só acesso por chave SSH | P1 |
| 12 | **Chave ativa da API Platform** (`ap_live_…`) | `memory/ACTIVE_PROJECT_MEMORY.md` + 3 cópias arquivadas de código (versionados); também em `C:\projetos\ai-engine-core\ACTIVE_PROJECT_MEMORY.md` (fora do git) | histórico git | revogar na API Platform e emitir nova; valor já removido dos 4 arquivos versionados | **P0** |
| 11 | Possível histórico com segredos | `C:\projetos\ai-engine-core\_vps-rescue\vps-rescue.bundle` (88 MB, fora do git) | **não verificado** | inspecionar ou apagar | P2 |

## 2. Estado do git após o LEVEL 1

- `git rm --cached` aplicado (sem commit) em: `grg/.secrets/ai_provider_key`, `keycloak_admin_password`, `keycloak_user_password`, `metrics_token`, `minio_access_key`, `minio_secret_key`, `postgres_password`, `redis_password`, `grg/memory/.secrets-vault.json`. Os arquivos **continuam no disco** (o compose os lê).
- `.gitignore` já cobria `.secrets/`; acrescentado `memory/.secrets-vault.json` em `grg/.gitignore`.
- **O histórico ainda contém os segredos** (commit `58a934c9` e anteriores). Se o repositório remoto não for estritamente privado, ou se houver forks/clones de terceiros, reescrever o histórico (`git filter-repo --path grg/.secrets --path grg/memory/.secrets-vault.json --invert-paths`) **depois** da rotação. Reescrita de histórico é decisão do proprietário (força push e invalida clones).

## 3. Ordem recomendada

1. Trocar senha do `grg-admin` e revogar sessões (item 1).
2. Revogar chave do provedor de IA (item 2) e definir `FENIX_VAULT_KEY` (item 3).
3. Trocar banco/S3/Keycloak/Redis se os arquivos de 7 bytes forem reais (item 4, 6–8).
4. Apagar scripts e JSONs de credenciais da raiz `C:\projetos\ai-engine-core`.
5. Só então fazer o deploy do LEVEL 1 (ver `LEVEL1_DEPLOYMENT_PLAN.md`).
6. Decidir sobre reescrita de histórico.