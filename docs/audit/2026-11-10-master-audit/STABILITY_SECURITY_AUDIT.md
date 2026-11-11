# STABILITY_SECURITY_AUDIT — FÊNIX OS

Data: 2026-11-10 · Método: leitura de código, `git ls-files`, sondagem **somente-leitura e não autenticada** da produção.
**Nenhum valor secreto foi impresso ou copiado neste relatório.** Nenhuma tentativa de exploração foi feita contra a produção.
✔ = verificado pessoalmente pelo auditor principal. Caminhos relativos a `ai-engine/grg/src/` salvo indicação.

## 1. Resumo

O sistema tem hoje uma **cadeia de comprometimento total sem credenciais**, confirmada no código:

1. ✔ `POST /api/v2/preview/dev-session` (`server.js:576-592`) é atendido **antes** do bloqueio de autenticação, sem checagem de ambiente, e aceita `userId`/`tenantId` do corpo da requisição.
2. ✔ `createPreviewSession` (`auth/auth.js:138-166`) só cria vínculo `viewer` se o usuário **ainda não tem** vínculo. Para `userId:"grg-admin"` o vínculo `master_admin` existente é mantido.
3. ✔ O token de preview é aceito como sessão normal (`auth/auth.js:235-241`, cookie `fenix_preview_session`).
4. ✔ A autorização usa o **papel do vínculo**, não o da sessão (`control-plane/control-plane.js:105-108`). O flag `readOnly` só é checado em WebSocket (`server.js:1853`) e em tokens de análise (`server.js:238`).
5. ✔ `POST /api/v2/reality-operator/terminal/exec` (`api/universal-system-routes.js:687-695`) chama `executeTerminalCommand` → `cp.execSync(command)` (`reality-operator/reality-operator-kernel.js:1118`) **sem nenhum `authorize`**. A "trava de segurança" é uma regex contra `rm -rf` que o próprio chamador desliga com `options.confirmed: true` (`:1106-1114`).

Resultado: **execução remota de comandos no host por qualquer pessoa que alcance a API.** [HIPÓTESE forte] vale para produção, que responde `environment: development`; **não testado em produção, de propósito**.

Além disso: ✔ backdoor de senha fixa para `grg-admin`/`admin` (`auth/auth.js:107-115`) e ✔ 9 arquivos de segredo versionados no git.

## 2. Achados

| ID | Sev. | Arquivo:linha | Achado | Evidência | Recomendação |
|---|---|---|---|---|---|
| S1 | **P0** | ✔ `auth/auth.js:107-115` | Backdoor: duas senhas literais sempre funcionam para `grg-admin`/`admin` e **sobrescrevem o hash salvo**. ✔ **Os dois literais são triviais e adivinháveis sem acesso ao código** (valores omitidos de propósito) | `if (!isValid && (password === <literal> …) && (user.id === 'grg-admin' …)) isValid = true` | Apagar o bloco; trocar a senha do admin; revogar todas as sessões |
| S2 | **P0** | ✔ `server.js:576-592`; `auth/auth.js:138-166,235-241` | Qualquer pessoa obtém sessão como qualquer usuário existente via dev-session | ver §1 | Remover a rota fora de dev; fixar usuário de preview; aplicar `readOnly` em todo método não-GET |
| S3 | **P0** | ✔ `api/universal-system-routes.js:687-695`; `reality-operator/reality-operator-kernel.js:1092-1118` | RCE: terminal/exec sem autorização (também `command-palette` e `files/edit` com `fs.writeFileSync` em caminho absoluto do corpo: `:643-651`, `:709-716`) | só 14 `authorize(` em 113 handlers do arquivo | Remover ou exigir `runtime:admin` + allowlist com `execFile` + raiz de projeto |
| S4 | P1 | `api/universal-system-routes.js:2172-2197` | `/api/v2/terminal/exec` com `execSync`; exige `runtime:admin`, mas alcançável via S1/S2 | — | Desligar em produção |
| S5 | **P0** | ✔ git: `grg/.secrets/*` (8) + `grg/memory/.secrets-vault.json` | Segredos **versionados** apesar do `.gitignore` (`grg/.gitignore:8`, `.gitignore:18`). `ai_provider_key` tem 166 B (compatível com chave real); 7 arquivos de 7 B (prováveis placeholders) | `git ls-files`; último commit 58a934c9 | `git rm --cached`, rotacionar a chave de IA, limpar o histórico |
| S6 | P1 | `security/secret-vault.js:15-20` | Chave do vault cai em literal fixo + salt `'salt'` se `FENIX_VAULT_KEY` ausente; o vault cifrado está no git → decifrável por quem tem o repo [HIPÓTESE: produção sem a env] | — | Falhar fechado sem a env; rotacionar |
| S7 | P1 | `grg/diag.sh:7-9` (versionado) | Senha de admin literal num `curl` | — | Remover e rotacionar |
| S8 | P1 | raiz `C:\projetos\ai-engine-core` (fora do git): `.env.production`, `update_vps_env.sh`, `update_pm2_env.sh`, `test_pg.js`, `inspect_users.js`, `inspect_user_passwords.js`, `login_admin.json`, `login_payload.json`, `deploy.bat` | Credenciais de banco, S3 e login em texto puro em pasta de rascunhos; `_vps-rescue/vps-rescue.bundle` (88 MB) pode conter histórico com segredos [HIPÓTESE] | — | Mover para cofre; apagar scripts de rascunho; rotacionar |
| S9 | P1 | `api/project-git-routes.js:249-252,304-310` | Token do GitHub enviado para `cloneUrl` controlada pelo usuário e visível nos argumentos do processo | `-c http.extraHeader=AUTHORIZATION: bearer …` | Só para github.com, via `GIT_ASKPASS` |
| S10 | P1 | `api/project-workspace-routes.js:103,131` | Injeção de opção do git: `repository` do corpo vai direto para `git clone` (`--upload-pack=…`) | — | Validar `^https://`, usar `--` |
| S11 | P2 | `repo-intel/cloning-git-host.js:24` | `execSync` com interpolação; hoje limitado por regex | — | `execFile` |
| A1 | P1 | ✔ `server.js:597-612` | `/api/v2/images*`, `/api/v2/creative-studio*`, `/api/v2/public/projects` dão identidade fabricada (`grg`/`system-service`, `readOnly:false`) a anônimos, com CORS `*` → uso gratuito de geração de imagem paga | `if (!cx) cx = { tenantId:'grg', actorId:'system-service' }` | Exigir autenticação |
| A2 | P1 | `server.js:241-282, 462-537, 545-548` | Rotas antes do bloqueio de auth: `/api/runtime/services`, `/api/runtime/ai/usage` (custo/tokens de **todos os tenants**), `/api/test/event`, `/api/v2/health/*`, `/api/providers`, `/api/plans`, `/api/orchestrator/*`, `/api/estimates` | ordem de despacho | Mover para trás da autenticação e filtrar por tenant |
| A3 | P2 | ✔ `security/config.js:23-33` (alteração **não commitada**) | Guarda "bootstrap admin proibido em produção" desligada com `if (false && …)`; usuário padrão sempre `grg-admin` com senha vazia → **o servidor não sobe sem `FENIX_BOOTSTRAP_ADMIN_PASSWORD`** e **301 testes falham** | `git diff HEAD -- src/security/config.js` | Reverter para a versão do HEAD |
| A4 | P2 | `auth/auth.js:120-121`; `server.js:562-572` | Sessão de 30 dias por padrão; logout revoga só o Bearer, não o cookie | — | 12 h; revogar cookie |
| A5 | P2 | `security/security-plane.js:3-24,63-65` | Rate limit de login por `remoteAddress`; atrás de proxy todos compartilham um IP → limite global e DoS de bloqueio; mapa sem evicção | — | X-Forwarded-For confiável, backoff por conta |
| A6 | P3 | `server.js:567, 1843-1853` | Cookie sem `Secure`; sem CSRF/Origin; WebSocket aceita `?token=` na URL | — | `Secure`, checar Origin |
| A7 | P3 | `server.js:2139-2141` | `startsWith(PUBLIC)` sem separador | — | `PUBLIC + path.sep` |
| A8 | P2 | ✔ produção | `index_frozen_backup.html` e `fenix-world-3d.js.bak` (400 KB) servidos publicamente (HTTP 200 sem login) | `curl https://209.50.241.22/fenix-world-3d.js.bak` | Remover de `public/` |
| A9 | P2 | ✔ produção | `/health` público expõe topologia (Postgres, Redis, Qdrant, provedores, circuit breakers) e `environment: development` | `curl /health` | Health detalhado só autenticado |
| A10 | P1 | test `OIDC verifier rejects insecure endpoints and unsigned identities` | **Falha na suíte atual** ("Missing expected exception") → verificador OIDC aceita endpoint inseguro ou identidade sem assinatura [HIPÓTESE sobre qual dos dois] | `test_full` | Investigar antes de qualquer deploy |
| T1 | P2 | `api/universal-system-routes.js` (singletons globais), `api/unreal-world-routes.js:244-246`, `brain/graph-brain.js`, `agents/agent-registry.js`, `memory/pattern-library.js` | Estado de processo **não isolado por tenant** | 0 ocorrências de `tenantId` em `graph-brain.js` | Indexar todo estado por tenant |
| T2 | P2 | `server.js:1888, 1910-1928` | WebSocket: resync fixo no tenant `grg`; fan-out de **todos** os eventos do bus para **todos** os sockets, sem filtro de tenant | — | Filtrar por tenant da sessão |
| ST1 | P1 | ✔ `server.js:41-42` | `uncaughtException`/`unhandledRejection` só logam; processo segue em estado indefinido | — | Logar e sair; o orquestrador reinicia |
| ST2 | P2 | todo `src/` | 272 `catch {}` vazios, 68 com só comentário, 59 `.catch(()=>{})` — inclusive em auth (`auth/auth.js:242`) | grep | Logar no mínimo em debug |
| ST3 | P1 | `infrastructure/database/postgres-store.js:105-253`; `kernel/store.js:209-303` | **Todo o estado é um único documento JSON** reescrito inteiro a cada escrita (`kernel_state`, linha `global`, `FOR UPDATE`). Comentário em `server.js:137-141` registra ~25 s por escrita sob disputa e 17 runs presos em RUNNING | — | Separar coleções quentes em tabelas/append-only |
| ST4 | P1 | `api/project-workspace-routes.js:80,123,144,293`; `api/project-git-routes.js:402` | Ler-modificar-`store.write(state)` fora de `store.update` → **perda de atualizações concorrentes** (9 pontos) | — | Usar `store.update(mutator)` |
| ST5 | P2 | `ai-runtime/ai-gateway.js:314`; `eventing/event-store.js:49`; `governance/audit-trail.js:89` | `aiCalls`, `domainEvents`, `auditEvents` crescem dentro do documento único [HIPÓTESE: sem poda em todos os backends; o Postgres tem poda de retenção em `update()`] | — | Retenção ou tabelas |
| ST6 | P3 | `auth/auth.js:24`; `server.js:2119`; `api/unreal-world-routes.js:246`; `api/project-git-routes.js:14-16` | Maps em memória sem limite (sessões, cache estático, traces, git) | — | LRU/TTL |
| ST7 | OK/P3 | ✔ `runtime/job-engine.js:98,274-275` | JobEngine **tem** `maxAttempts` (≤10) e `DEAD_LETTER`. ~40 outros lugares marcam `RUNNING` fora do JobEngine sem reaper | — | Leases para runs fora do JobEngine |
| ST8 | P2 | ✔ `grg/.data/` | 71 arquivos `state.json.*.tmp` de escritas atômicas interrompidas, 1 `state.json.corrupt-*`, 38 `factory-worker-<PID>.json` órfãos | `ls grg/.data` | Limpeza no boot; investigar a corrupção |
| ST9 | P2 | ✔ suíte de testes | Os testes escrevem em diretórios de dados reais: esta auditoria, ao rodar a suíte, alterou `grg/data/assets-3d.json` (versionado) e criou `grg/data/test-snapshot-workspace/` (**ambos revertidos pelo auditor**) | `git status` antes/depois | Isolar todo teste em diretório temporário |
| ST10 | P2 | `core/Kernel.js:120-152` | O Kernel faz `require()` de **todo** `.js` em `src/` no boot, engolindo erros → módulos mortos executam efeitos colaterais (leitura de arquivos, logs de Redis) | ✔ `Kernel.js:135` | Registrar só módulos declarados |
| ST11 | P2 | `server.js:1966-2001` + `runtime/worker.js:33-39,154` | API **e** worker consomem a mesma fila; a única proteção é o claim persistido | — | Só o worker consome em produção |

## 3. Persistência e recuperação

- Seleção de store (`app.js:122-130`): Postgres em produção ✔ (`/health`: `state-store: postgresql`); **SQLite** local por padrão (`infrastructure/config.js:7` → `sqlite://./.data/fenix.db`), embora `server.js:90` calcule um caminho `state.json` que só é usado programaticamente.
- Stores paralelos fora do documento: `grg/.data/jobs-v8.json` (JobQueueManager), `src/.data/graph_brain.json` (sem lock, sem tenant), `agent-avatars.json`, StorageManager do KnowledgeEngine.
- Recuperação após reinício: JobEngine re-enfileira jobs RUNNING com heartbeat vencido (`runtime/job-engine.js:176-196`). Runs de ativação operacional, missões do KnowledgeEngine e o JobQueueManager **não** têm o mesmo mecanismo.
- `PatternLibrary` (`memory/pattern-library.js`) só existe em memória: **perde tudo a cada reinício**.

## 4. Frontend (estabilidade)

| Item | Contagem / evidência |
|---|---|
| `setInterval` × `clearInterval` | 43 × 28 |
| `requestAnimationFrame` × `cancelAnimationFrame` | 34 × 9 |
| `addEventListener` × `removeEventListener` | 1215 × 31 |
| Intervalos que rodam fora da view ativa | `fenix-city-adaptive-dock.js:867`, `city-reality-engine.js:81`, `fenix-spatial-city.js:2579`, `fenix-dynamic-agent-hud.js:28`, `fenix-core-controller.js:736`, `qwen-project-orchestrator.js:82`, `fenix-mascot-sidebar.js:685` |
| Loops rAF sem cancelamento | `fenix-spatial-city.js:2998`, `fenix-city-adaptive-dock.js:830-835`, `unreal-world-live.js:525,654` |
| Segunda conexão SSE ao mesmo stream | `fenix-spatial-city.js:2589` (as outras 3 compartilham `window.__FENIX_SSE_SOURCE__`) |
| Listeners empilháveis [HIPÓTESE] | `fenix-v8-ui.js:535-540` sem guarda de "já registrado" |
| Correto | O motor 3D pausa em `visibilitychange` (`fenix-world-3d.js:1743-1892`); reconexão do WebSocket é limitada (`live-runtime.js:453-468`) |

## 5. Não verificado

- Se S2+S3 funcionam de fato em produção (deliberadamente não testado).
- Se o repositório remoto no GitHub é público (afeta a gravidade de S5/S6).
- Se `FENIX_VAULT_KEY` está definido em produção.
- Conteúdo de `grg/qa/vps-city-qa-credentials.js` (leitura negada pelas permissões; não insistimos).
- Vazamento de memória medido em execução longa (não houve sessão de profiling).