# LEVEL1_SECURITY_REMEDIATION — FÊNIX OS

Data: 2026-11-10 · Escopo: workspace local (`ai-engine/`). **Nada foi commitado, nada foi implantado, nenhuma credencial externa foi trocada, nenhum teste foi feito contra a VPS.**

## 1. Protocolo de preservação

- Estado do git registrado antes de qualquer alteração (709 entradas sujas; HEAD `70463c04`).
- Quatro arquivos-alvo já tinham alterações locais suas: `grg/src/auth/auth.js`, `grg/src/server.js`, `grg/src/app.js`, `grg/src/security/config.js`. Cópias e diffs guardados antes da edição.
- **Gate G verificado linha a linha:** todas as suas linhas locais continuam presentes, exceto as que eram o próprio problema: o bloco do backdoor (8 linhas em `auth.js`) e duas linhas de `config.js` (usuário padrão fixo e `if (false && …)`). As alterações locais de `server.js` (motor de evolução, rotas de confiabilidade, `/api/v2/public/projects`) e de `app.js` (self-healing, limite de recuperação de missões, bootstrap no `createApp`) foram preservadas integralmente.
- Nenhum `git reset`, `git clean`, `stash` ou commit. Únicas operações no índice: `git rm --cached` dos segredos e `git mv` de um backup (ambos reversíveis).

## 2. Correções

| # | Arquivo | Função / ponto | Problema anterior | Alteração | Teste | Resultado |
|---|---|---|---|---|---|---|
| 1 | `grg/src/auth/auth.js` | `login()` | Duas senhas triviais autenticavam `grg-admin`/`admin` e regravavam o hash | Bloco removido; só `verifyPassword` contra o hash persistido | `GATE A: trivial legacy passwords never authenticate the admin` (HTTP) | ✔ 403 para as duas senhas; senha real continua funcionando |
| 2 | `grg/src/security/config.js` | `loadSecurityConfig()` | Usuário bootstrap padrão `grg-admin` sempre ativo, senha vazia → servidor não subia; guarda de produção desligada com `if (false && …)`; versão do HEAD tinha senha padrão previsível em dev | Sem valor padrão: bootstrap só com usuário **e** senha explícitos; em produção exige senha ≥ 16, diferente do usuário e fora de lista trivial; novo `allowPreviewSession` (nunca em produção) | `GATE A: security config never invents predictable bootstrap credentials`; `GATE B: preview sessions are disabled…` | ✔ |
| 3 | `grg/src/server.js` | rota `POST /api/v2/preview/dev-session` | Anônimo, antes da autenticação, aceitava `userId`/`tenantId` do cliente e reaproveitava o vínculo existente (admin) | 404 se `allowPreviewSession` falso; identidade fixa `preview-user`; tenant do bootstrap | `GATE B: preview session ignores client identity…`; `…cannot be minted when the preview flag is off` | ✔ |
| 4 | `grg/src/auth/auth.js` | `createPreviewSession()` | Emitia token para qualquer id, herdando vínculo de papel alto | Recusa (403) se o id pertence a usuário real ou a vínculo ≠ viewer | idem | ✔ |
| 5 | `grg/src/server.js` | gate após `authenticate` | Escrita sem verificação de papel; `readOnly` ignorado em HTTP | **Gate central de escrita**: todo POST/PUT/PATCH/DELETE exige sessão não somente-leitura e vínculo ativo com papel que tenha alguma permissão de escrita (`canMutate`) | `GATE C: route-table sweep` (341 rotas literais + 4 dinâmicas) | ✔ viewer 403, anônimo 401/403 em todas |
| 6 | `grg/src/kernel/access-control.js` | `canMutate()` (novo) | — | viewer/employee são somente leitura | idem | ✔ |
| 7 | `grg/src/server.js` | identidade fabricada para `/api/v2/images*`, `/api/v2/creative-studio*`, `/api/v2/public/projects` | Anônimo recebia `readOnly:false` (geração paga e escrita sem login) | `readOnly:true` | sweep | ✔ GET anônimo continua; escrita 403 |
| 8 | `grg/src/api/universal-system-routes.js` | bloco `/api/v2/reality-operator/*` (16 rotas POST) | Nenhuma rota checava permissão (RCE e escrita de arquivo para qualquer sessão) | `authorize` no início do bloco: GET → `runtime:read`; demais → `runtime:admin`; erros de domínio devolvem o status correto (403) em vez de 500 | `GATE C: anonymous…`, `viewer and subadmin cannot execute…` | ✔ |
| 9 | `grg/src/security/safe-command.js` (novo) | `parseSafeCommand()` | Texto do cliente ia direto para `execSync` (shell) | Allowlist sem shell: `node` (flags/arquivo relativo), `npm test|ls|run <script>`, `git` só leitura (`--no-pager`); recusa metacaracteres, `-e`, `..`, caminhos absolutos, `git -c` etc. | `GATE C: admin terminal runs only allowlisted commands…` (9 ataques) | ✔ todos 403; `node --version` ok |
| 10 | `grg/src/reality-operator/reality-operator-kernel.js` | `executeTerminalCommand()` | `execSync(command)`; trava contornável por `options.confirmed` do cliente | `parseSafeCommand` + `execFileSync` sem shell; `cwd` confinado ao workspace; timeout limitado; `confirmed` não libera nada | idem | ✔ |
| 11 | idem | `resolveWorkspacePath()` (novo), `editFile()`, `revertFile()`, `create_checkpoint` | Escrita/restauração em qualquer caminho absoluto | Caminho resolvido com `realpath`, obrigatoriamente dentro da raiz do workspace ou de projeto registrado; recusa `.env*`, `.secrets`, `.git`, `node_modules`, chaves privadas, `secrets-vault.json` | `GATE C: admin file edit and revert are confined…` (fora, traversal, revert, checkpoint, `.env.production`) | ✔ arquivo-vítima intacto |
| 12 | `grg/src/api/universal-system-routes.js` | `POST /api/v2/terminal/exec` | `execSync(command)` (já exigia `runtime:admin`) | mesma allowlist sem shell | `EXEC_ROUTES` | ✔ |
| 13 | `grg/src/security/secret-vault.js` | construtor, `storeSecret`, `resolveSecret` | Chave padrão fixa + salt `'salt'` quando `FENIX_VAULT_KEY` ausente | Fail-closed: sem chave ≥ 16 o cofre não cifra nem decifra; salt configurável | `GATE D: secret vault fails closed…` | ✔ |
| 14 | git | índice | 9 arquivos de segredo versionados | `git rm --cached` (arquivos permanecem no disco); `.gitignore` reforçado | `GATE D: no secret files are tracked by git` | ✔ |
| 15 | 4 arquivos versionados | `memory/ACTIVE_PROJECT_MEMORY.md` + 3 cópias arquivadas de código (`archive/…`, `grg/qa-results/…`) | Chave **ativa** da API Platform (`ap_live_…`) em texto puro (achado novo do LEVEL 1) | Somente o valor trocado por `ap_live_REDACTED_LEVEL1` | `deployment-secret-boundaries.test.js` (falhava antes) | ✔ passa |
| 16 | `grg/diag.sh` | `curl` de login | Senha de admin literal | Lê `FENIX_DIAG_USER`/`FENIX_DIAG_PASSWORD` do ambiente | revisão | ✔ |
| 17 | `grg/src/server.js` | `/health` | Topologia interna pública | Em produção, anônimo recebe só `ok/status/service/checkedAt` (`summarizeHealthForPublic`) | `GATE E: production health hides…` | ✔ |
| 18 | `grg/src/server.js` | `POST /api/test/event` | Diagnóstico sem auth | 404 em produção | sweep (allowlist documentada) | ✔ |
| 19 | `grg/src/server.js` | `serveStatic()` | `.bak`/backups servidos; prefixo sem separador | Só arquivos regulares dentro de `public/` + separador; recusa dotfiles, `*.bak/orig/old/tmp/swp/backup`, `*backup*` | `GATE E: backups, dotfiles and sibling paths…` (8 caminhos) | ✔ 404; `/app` 200 |
| 20 | `grg/public/` | `index_frozen_backup.html` (versionado), `fenix-world-3d.js.bak` (não versionado) | Servidos publicamente | **Movidos** (não apagados) para `archive/retired-frontends/level1-public-backups-20261110/`; única referência é o manifesto gerado no deploy | idem | ✔ |
| 21 | `grg/src/server.js` | `uncaughtException`/`unhandledRejection` | Só logados; processo seguia em estado indefinido | `createFatalHandler`: log com segredos mascarados → fechamento dos servidores (workers, loops, conexões via `server.close`) com timeout → `exit(1)`; instalado só no processo principal; rejeição solta registrada como erro (fatal com `FENIX_FATAL_ON_UNHANDLED_REJECTION=1`) | `fatal handler logs safely, closes resources and exits non-zero` | ✔ |
| 22 | `grg/docker-compose.enterprise.yml` | allowlist de env | `FENIX_VAULT_KEY` não chegava ao container | `FENIX_VAULT_KEY` e `FENIX_FATAL_ON_UNHANDLED_REJECTION` repassados (sem valores) | `compose-runtime-env.test.js`, `GATE E: compose pins FENIX_ENV=production` | ✔ |

## 3. Não alterado de propósito

| Item | Motivo |
|---|---|
| `grg/src/auth/oidc-verifier.js` aceita endpoints OIDC por HTTP | Decisão sua (commit `ba2285df`); o `.env.production` local usa emissor e JWKS em HTTP no IP público. Exigir HTTPS agora quebraria o login de produção. Token sem assinatura já é rejeitado. Ver `LEVEL1_RESIDUAL_RISKS.md` R16 |
| Rotas de **leitura** antes da autenticação (`/api/runtime/ai/usage` etc.) | Não são escrita/execução; LEVEL 2 (BUG-008) |
| `CLAUDE.md` (Regra V desatualizada) | Fora do escopo de segurança |
| Arquivos de credenciais na raiz `C:\projetos\ai-engine-core` | Fora do git; apagar é decisão sua |
| `release-manifest.json` | Artefato gerado pelo script de deploy |

## 4. Arquivos modificados ou criados pelo LEVEL 1

Modificados: `grg/src/auth/auth.js`, `grg/src/server.js`, `grg/src/security/config.js`, `grg/src/security/secret-vault.js`, `grg/src/kernel/access-control.js`, `grg/src/api/universal-system-routes.js`, `grg/src/reality-operator/reality-operator-kernel.js`, `grg/docker-compose.enterprise.yml`, `grg/diag.sh`, `grg/.gitignore`, `memory/ACTIVE_PROJECT_MEMORY.md`, `archive/retired-frontends/vps_source/grg/src/api/product-experience-routes.js`, `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/api/product-experience-routes.js`, `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/execution/fenix-worker.js`.
Criados: `grg/src/security/safe-command.js`, `grg/test/level1-security.test.js`, `archive/retired-frontends/level1-public-backups-20261110/` (2 arquivos movidos), relatórios `LEVEL1_*.md`.
Removidos do índice (permanecem no disco): `grg/.secrets/*` (8), `grg/memory/.secrets-vault.json`.

## 5. Efeitos colaterais da suíte, revertidos

A suíte completa (e não o código do LEVEL 1) gravou em dados reais durante a execução. Tudo foi revertido:
- `grg/data/assets-3d.json` alterado → restaurado do HEAD.
- `grg/memory/development-memory.json` alterado → restaurado; o novo teste de segurança passou a isolar essa memória em diretório temporário.
- `grg/AGENT_EXECUTION_REPORT.md` criado → removido.
- **`grg/.git` criado** (repositório aninhado com um commit vazio "initial workspace commit") por `agents/agent-workspace-executor.js:46-57`, que faz `git init` em qualquer pasta de projeto sem `.git` própria → removido. Esse comportamento ficava escondido porque os testes que chegam até ele quebravam antes (falha de configuração); agora aparece. Registrado como BUG-039.