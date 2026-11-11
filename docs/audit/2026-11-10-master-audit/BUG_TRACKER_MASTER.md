# BUG_TRACKER_MASTER — FÊNIX OS

Data: 2026-11-10. Prioridades: **P0** falha crítica/risco de perda de dados ou segurança · **P1** funcionalidade essencial quebrada · **P2** arquitetura/estabilidade · **P3** UX/performance · **P4** evolução.
Esforço: P (≤ 0,5 dia) · M (1–3 dias) · G (1–2 semanas) · GG (> 2 semanas).

## Índice

| ID | P | Módulo | Problema | Esforço |
|---|---|---|---|---|
| BUG-001 | P0 | auth | Backdoor de senha fixa para admin | P |
| BUG-002 | P0 | auth/server | Sessão de preview anônima herda papel de admin | P |
| BUG-003 | P0 | reality-operator | Execução de comandos e escrita de arquivos sem autorização | P |
| BUG-004 | P0 | repositório | Segredos versionados no git | M |
| BUG-005 | P0 | ops | Produção roda como `development` (echo ativo, guardas de produção desligadas) | P |
| BUG-006 | P1 | security/config | Alteração não commitada quebra boot sem senha e 301 testes | P |
| BUG-007 | P1 | auth/OIDC | Verificador OIDC não rejeita endpoint inseguro/identidade sem assinatura | M |
| BUG-008 | P1 | server | ~15 rotas atendidas antes da autenticação (inclui uso de IA de todos os tenants) | M |
| BUG-009 | P1 | server | Identidade fabricada para images/creative-studio/public projects | P |
| BUG-010 | P1 | project-git | Token GitHub enviado para URL controlada pelo usuário | P |
| BUG-011 | P1 | project-workspace | Injeção de opção no `git clone` | P |
| BUG-012 | P1 | execution | Worker devolve sucesso fabricado quando a IA falha | P |
| BUG-013 | P1 | orchestrator | PATCH autônomo sobrescreve arquivo inteiro | M |
| BUG-014 | P1 | stores | Ler-modificar-escrever fora de `store.update` (perda de atualização) | M |
| BUG-015 | P1 | memory | KnowledgeGenome nunca indexa no Qdrant | P |
| BUG-016 | P1 | server | `uncaughtException` engolido | P |
| BUG-017 | P1 | security/vault | Chave do vault com valor padrão fixo | P |
| BUG-018 | P2 | persistência | Estado inteiro num único documento JSON | GG |
| BUG-019 | P2 | multi-tenant | GraphBrain/AgentRegistry/PatternLibrary/WebSocket sem tenant | G |
| BUG-020 | P2 | runtime | Dois sistemas de fila e dois consumidores | G |
| BUG-021 | P2 | ai | 8 roteadores de modelo | G |
| BUG-022 | P2 | ai | Embeddings por hash | M |
| BUG-023 | P2 | ai | Orçamento/preço nunca configurados | M |
| BUG-024 | P2 | kernel | Kernel faz `require` de todos os arquivos no boot | M |
| BUG-025 | P2 | testes | Testes escrevem em dados reais | M |
| BUG-026 | P2 | dados | 71 `.tmp`, 1 `.corrupt`, 38 arquivos de worker órfãos | P |
| BUG-027 | P2 | deploy | Instrução canônica de deploy aponta para script desativado | P |
| BUG-028 | P2 | deploy | Container roda código montado do host, não a imagem | M |
| BUG-029 | P2 | frontend | Arquivos de backup servidos publicamente | P |
| BUG-030 | P2 | agents | Pool dinâmico simula conclusão com `setTimeout` | M |
| BUG-031 | P3 | frontend | Valores fictícios (`98%`, `\|\| 4`, catálogo "VERIFIED REAL") | M |
| BUG-032 | P3 | frontend | ≥10 chamadas a endpoints inexistentes | M |
| BUG-033 | P3 | frontend | Intervalos/rAF/SSE rodando fora da view ativa | M |
| BUG-034 | P3 | frontend | QA de navegação E2E não passa | G |
| BUG-035 | P3 | cidade | Fallback 2D, custo de GPU e colisão de lotes falhando nos testes | M |
| BUG-036 | P3 | frontend | 8.270 `!important`, 50 folhas de estilo | GG |
| BUG-037 | P3 | acessibilidade | ~96 clicáveis não acessíveis por teclado | M |
| BUG-038 | P3 | repositório | 460 MB de binários/arquivos compactados versionados | M |

---

## Detalhamento

### BUG-001 · P0 · Backdoor de senha fixa
- **Evidência:** ✔ `grg/src/auth/auth.js:107-115` — se a senha não confere mas é um de dois literais e o usuário é `grg-admin`/`admin`, o login é aceito e o hash salvo é **sobrescrito**.
- **Impacto:** acesso de `master_admin` (permissão `*`). ✔ Os literais são triviais e adivinháveis por qualquer pessoa, sem acesso ao repositório.
- **Causa provável:** atalho de recuperação de acesso deixado no código.
- **Solução:** apagar o bloco; trocar a senha do admin; revogar todas as sessões.
- **Dependências:** nenhuma. **Critério de aceitação:** login com os literais retorna 403 para todos os usuários.
- **Teste:** `auth.test.js` já contém "legacy bootstrap passwords cannot bypass the persisted password hash" — fazê-lo rodar (depende de BUG-006).

### BUG-002 · P0 · Preview anônimo herda admin
- **Evidência:** ✔ `server.js:576-592` (antes da auth, sem checar ambiente); ✔ `auth/auth.js:157-160` (não rebaixa vínculo existente); ✔ `auth/auth.js:235-241` (token aceito); ✔ `control-plane/control-plane.js:105-108` (permissão pelo vínculo).
- **Impacto:** qualquer pessoa vira `grg-admin` por 15 min.
- **Solução:** desabilitar a rota fora de `development` explícito; usuário de preview fixo e não colidente; autorizar pelo papel da sessão quando `isPreview`; bloquear métodos não-GET para sessões `readOnly`.
- **Critério:** `POST /api/v2/preview/dev-session {"userId":"grg-admin"}` em produção → 404; em dev, a sessão não acessa nenhuma rota de escrita.
- **Teste:** HTTP com `start()`: preview + `grg-admin` → 403 em rota `runtime:admin` e em POST qualquer.

### BUG-003 · P0 · RCE e escrita arbitrária
- **Evidência:** ✔ `api/universal-system-routes.js:687-695` sem `authorize`; ✔ `reality-operator/reality-operator-kernel.js:1118` `cp.execSync(command)`; trava regex contornável com `options.confirmed` (`:1106-1114`); `files/edit` e `command-palette` (`:643-651`, `:709-716`).
- **Impacto:** comprometimento total do host/VPS (combinado com BUG-002, sem credencial).
- **Solução:** remover as rotas ou exigir `runtime:admin` + `execFile` com allowlist + raiz de projeto obrigatória; nunca aceitar `confirmed` do cliente para comandos destrutivos.
- **Critério:** viewer recebe 403; comando fora da allowlist é rejeitado.
- **Teste:** HTTP para as 3 rotas com viewer, admin e anônimo.

### BUG-004 · P0 · Segredos no git
- **Evidência:** ✔ `git ls-files` lista `grg/.secrets/*` (8) e `grg/memory/.secrets-vault.json`; `grg/diag.sh:7-9` com senha literal.
- **Solução:** `git rm --cached`; rotacionar chave de IA, senha de admin, banco, S3, vault; limpar histórico (filter-repo) se o remoto não for estritamente privado.
- **Critério:** `git ls-files | grep -E '\.secrets|vault'` vazio; chaves antigas revogadas no provedor.
- **Teste:** teste de repositório que falha se esses caminhos forem rastreados.

### BUG-005 · P0 · Produção em modo development
- **Evidência:** ✔ `/health` de produção: `"environment":"development"`, provedor `echo` ok.
- **Impacto:** desliga as guardas de produção (`app.js:162-168` recusa echo só em produção; `security/config.js` endurece só em produção); rate limit de login 100/min em vez de 10/min.
- **Solução:** `FENIX_ENV=production` no compose enterprise e no `.env.production`; corrigir o que quebrar no boot.
- **Critério:** `/health` mostra `production` e não lista `echo`.

### BUG-006 · P1 · Alteração local em `security/config.js`
- **Evidência:** ✔ `git diff HEAD -- grg/src/security/config.js`; 301 falhas "bootstrap admin requires both user and password".
- **Solução:** reverter para o HEAD (usuário padrão só fora de produção; guarda de produção ativa).
- **Critério:** suíte volta a ≥ 1.786 aprovados (1.485 + 301) [HIPÓTESE a confirmar].

### BUG-007 · P1 · OIDC
- **Evidência:** teste `OIDC verifier rejects insecure endpoints and unsigned identities` falha com "Missing expected exception".
- **Solução:** investigar o verificador (`auth/` / `security/`) e restaurar a rejeição.
- **Critério:** teste passa; token sem assinatura → 401.

### BUG-008 · P1 · Rotas antes da autenticação
- **Evidência:** `server.js:241-282, 462-537, 545-548`; `/api/runtime/ai/usage` agrega todos os tenants; `/api/estimates` sem filtro.
- **Solução:** manter públicos só `/health` (resumido) e `/api/login`/OIDC; o resto atrás de auth + filtro de tenant.
- **Teste:** lista de rotas públicas explícita, teste que varre e exige 401 para o resto.

### BUG-009 · P1 · Identidade fabricada
- **Evidência:** ✔ `server.js:597-612`.
- **Solução:** exigir sessão; se houver necessidade pública, rota somente-leitura e com limite.

### BUG-010 · P1 · Vazamento de token GitHub
- **Evidência:** `api/project-git-routes.js:249-252,304-310`.
- **Solução:** enviar credencial só para `https://github.com/`, via `GIT_ASKPASS`.

### BUG-011 · P1 · Injeção no git clone
- **Evidência:** `api/project-workspace-routes.js:103,131`.
- **Solução:** validar `^https://`, `--` antes da URL, `-c protocol.allow=…`.

### BUG-012 · P1 · Sucesso fabricado no worker
- **Evidência:** ✔ `execution/fenix-worker.js:164-175`, também `ai-runtime/model-orchestrator.js:49-56`, `missions/workers/*.js:20`, `routing/model-router.js:633-692`.
- **Solução:** `success:false` + erro tipado `AI_PROVIDER_UNAVAILABLE` (padrão da fast lane).
- **Teste:** provedor que lança → job FAILED, nada gravado na memória.

### BUG-013 · P1 · PATCH destrutivo
- **Evidência:** `orchestrator/autonomous-job-orchestrator.js:576, 596-604`.
- **Solução:** rotear PATCH pelo `safe-dev-pipeline` (diff em worktree).

### BUG-014 · P1 · Perda de atualização
- **Evidência:** `api/project-workspace-routes.js:80,123,144,293`; `api/project-git-routes.js:402`.
- **Solução:** `store.update(mutator)`.
- **Teste:** 20 requisições concorrentes → nenhuma perdida.

### BUG-015 · P1 · KnowledgeGenome → Qdrant
- **Evidência:** ✔ `memory/knowledge-genome.js:56` × `memory/qdrant-vector-store.js:37`.
- **Solução:** montar o objeto `memory` + vetor; remover `catch {}` silencioso.

### BUG-016 · P1 · Exceções engolidas
- **Evidência:** ✔ `server.js:41-42`.
- **Solução:** logar e `process.exit(1)`; o Docker reinicia (`restart: unless-stopped`).

### BUG-017 · P1 · Vault com chave padrão
- **Evidência:** `security/secret-vault.js:15-20`.
- **Solução:** falhar ao iniciar sem `FENIX_VAULT_KEY`; salt aleatório por instalação.

### BUG-018 · P2 · Documento único
- **Evidência:** `infrastructure/database/postgres-store.js:105-253`; comentário `server.js:137-141` (~25 s por escrita sob disputa).
- **Solução:** migrar coleções quentes (runtimeJobs, domainEvents, auditEvents, aiCalls, sessions) para tabelas próprias, mantendo a interface `store`.
- **Critério:** p95 de escrita < 50 ms com 10× o volume atual.

### BUG-019 · P2 · Isolamento de tenant
- **Evidência:** `brain/graph-brain.js` (0 `tenantId`), `agents/agent-registry.js`, `memory/pattern-library.js`, `server.js:1888, 1910-1928`.
- **Teste:** dois tenants; nenhum dado/evento cruza.

### BUG-020 · P2 · Filas duplicadas
- **Evidência:** `execution/job-queue-manager.js` × `runtime/job-engine.js`; API e worker consomem (`server.js:1966-2001`).
- **Solução:** migrar conversation-routes para JobEngine; só o worker consome em produção.

### BUG-021 · P2 · Roteadores de modelo
- Ver AI_INFRASTRUCTURE_AUDIT §3 e §9.

### BUG-022 · P2 · Embeddings por hash
- **Evidência:** ✔ `memory/embedding.js:3-14`. **Solução:** embeddings reais + reindexação.

### BUG-023 · P2 · Custo
- **Evidência:** `ai-runtime/ai-gateway.js:265-319, 381-386`. **Solução:** preços por env, orçamento por tenant.

### BUG-024 · P2 · Kernel require-all
- **Evidência:** ✔ `core/Kernel.js:135`. **Solução:** registrar módulos explicitamente; parar de executar código morto no boot.

### BUG-025 · P2 · Testes sujam dados reais
- **Evidência:** ✔ a suíte desta auditoria alterou `grg/data/assets-3d.json` e criou `grg/data/test-snapshot-workspace/` (revertidos); falha `EBUSY` no teste de snapshot.
- **Solução:** todos os testes em `os.tmpdir()`.

### BUG-026 · P2 · Lixo em `grg/.data`
- **Evidência:** ✔ 71 `.tmp`, `state.json.corrupt-*`, 38 `factory-worker-*.json`.
- **Solução:** limpeza no boot; investigar a origem da corrupção.

### BUG-027 · P2 · Deploy documentado errado
- **Evidência:** `CLAUDE.md` Regra V × `ai-engine/deploy.bat`/`ecosystem.config.js` desativados × compose enterprise em uso.
- **Solução:** um único procedimento documentado e testado.

### BUG-028 · P2 · Código montado do host
- **Evidência:** `docker-compose.enterprise.yml` monta `./src:/app/src:ro` e 4 `public/*.js`.
- **Solução:** imagem imutável por versão; rollback = trocar a tag.

### BUG-029 · P2 · Backups públicos
- **Evidência:** ✔ HTTP 200 em `/index_frozen_backup.html` e `/fenix-world-3d.js.bak`.
- **Solução:** remover de `public/`; `.dockerignore`.

### BUG-030 · P2 · Pool dinâmico simulado
- **Evidência:** ✔ `agents/dynamic-pool-manager.js:279-292`.
- **Solução:** despachar para JobEngine (`agent.execute`) ou remover a UI.

### BUG-031 · P3 · Valores fictícios no frontend
- **Evidência:** ✔ `fenix-city-adaptive-dock.js:844`, ✔ `project-hub-controller.js:401`; `project-hub-live.js:2687-2859`; `fenix-flow-graph.js:3635`; selos "ZERO-MOCK 100% Real".
- **Solução:** `—` quando não há dado; estender `frontend-honesty-audit` para detectar `|| <número>` e `: '<n>%'`.

### BUG-032 · P3 · Endpoints inexistentes
- Ver UI_UX_AUDIT §4. **Teste:** extração estática de `fetch('/api/…')` × tabela de rotas.

### BUG-033 · P3 · Loops fora da view
- Ver STABILITY_SECURITY_AUDIT §4. **Solução:** ciclo de vida por view (start/stop no `fenix:viewchanged`).

### BUG-034 · P3 · QA de navegação
- **Evidência:** `qa-results/frontend-navigation-qa.json` bloqueado no login; suítes Playwright com timeout.
- **Solução:** usuário de QA local com credencial de fixture; rodar no CI com browsers instalados.

### BUG-035 · P3 · Cidade
- **Evidência:** 3 testes falhando (fallback 2D, `preserveDrawingBuffer`, colisão de lotes).

### BUG-036 · P3 · CSS
- **Evidência:** 8.270 `!important`; arquivos `*-overrides`, `*-fix`, `v10/v11/v15`.
- **Solução:** design system único com tokens; remoção progressiva por view, com teste visual.

### BUG-037 · P3 · Acessibilidade
- **Evidência:** 42+52 `div onclick`, 77 `outline:none`.

### BUG-038 · P3 · Repositório pesado
- **Evidência:** 35 arquivos > 1 MB, 16 compactados, 822 imagens, `node.exe` 66,8 MB.
- **Solução:** remover do índice, `.gitignore`/LFS; considerar reescrita de histórico só junto com BUG-004.

---

## Status após LEVEL 1 (2026-11-10)

Evidências: `LEVEL1_SECURITY_REMEDIATION.md` e `LEVEL1_SECURITY_TEST_RESULTS.md`. "Corrigido no código" = workspace local, **não implantado**.

| ID | Status | Evidência / pendência |
|---|---|---|
| BUG-001 | ✅ Corrigido no código | teste GATE A (HTTP); **pendente:** trocar a senha do admin (pode ter sido regravada por terceiros) |
| BUG-002 | ✅ Corrigido no código | testes GATE B |
| BUG-003 | ✅ Corrigido no código | testes GATE C + varredura de 341 rotas |
| BUG-004 | 🟡 Parcial | segredos fora do índice e chave `ap_live` removida de 4 arquivos (GATE D); **pendente do proprietário:** rotação e decisão sobre o histórico |
| BUG-005 | 🟡 Parcial | compose do repo já define `production` (teste GATE E); a VPS responde `development` → **verificar/implantar na VPS** (proprietário) |
| BUG-006 | ✅ Corrigido | `security/config.js` sem padrão previsível; +292 testes passando |
| BUG-007 | 🟠 Aberto, depende do proprietário | token sem assinatura já rejeitado; HTTP no OIDC é decisão anterior e a produção usa HTTP → exige TLS no Keycloak (risco R16) |
| BUG-009 | ✅ Corrigido no código | identidade anônima somente leitura |
| BUG-016 | ✅ Corrigido no código | `createFatalHandler` + teste |
| BUG-017 | ✅ Corrigido no código | cofre fail-closed + teste |
| BUG-029 | ✅ Corrigido no código | backups movidos para `archive/`; `serveStatic` recusa backups/dotfiles (teste GATE E) |
| BUG-008 | 🟡 Parcial | escrita protegida pelo gate central; rotas de **leitura** públicas continuam (LEVEL 2) |
| BUG-010, BUG-011 | ⏳ LEVEL 2 | protegidos indiretamente pelo gate central (exigem papel com escrita), correção específica pendente |

### Novos itens

| ID | P | Módulo | Problema | Evidência | Solução |
|---|---|---|---|---|---|
| BUG-039 | P2 | agents | `agent-workspace-executor.js:46-57` faz `git init` + commit em qualquer pasta de projeto sem `.git` própria; durante a suíte criou `grg/.git` aninhado | observado e revertido no LEVEL 1 | só inicializar repositório dentro de `FENIX_WORKSPACE_ROOT`; nunca em pasta que já esteja dentro de outro repositório (`git rev-parse --show-toplevel`) |
| BUG-040 | P0 | repositório | chave ativa da API Platform (`ap_live_…`) versionada em 4 arquivos | `deployment-secret-boundaries.test.js` falhava | ✅ valor removido; **pendente:** revogar a chave |