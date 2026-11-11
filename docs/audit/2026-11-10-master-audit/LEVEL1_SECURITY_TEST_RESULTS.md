# LEVEL1_SECURITY_TEST_RESULTS — FÊNIX OS

Data: 2026-11-10 · Runtime: Node v22.22.0 (`C:\projetos\ai-engine-core\node.exe`) · Todos os testes abaixo foram **executados**; nenhum resultado foi presumido.

## 1. Novos testes de segurança — `grg/test/level1-security.test.js`

Comportamento HTTP real: o servidor sobe com store temporário, cria usuários admin (`master_admin`), viewer e subadmin e tenta cada ataque.

| # | Teste | Cobre | Resultado |
|---|---|---|---|
| 1 | GATE A: trivial legacy passwords never authenticate the admin | backdoor | ✔ |
| 2 | GATE A: security config never invents predictable bootstrap credentials | bootstrap | ✔ |
| 3 | GATE B: preview sessions are disabled in production and by default | preview | ✔ |
| 4 | GATE B: preview session ignores client identity and stays read-only | troca de identidade, escalada | ✔ |
| 5 | GATE B: preview session cannot be minted when the preview flag is off | preview | ✔ |
| 6 | GATE B: invalid, expired and header-forged identities are rejected | token inválido, sessão expirada, header `x-user-id` | ✔ |
| 7 | GATE C: anonymous callers cannot reach any execution or file route | anônimo × 6 rotas | ✔ |
| 8 | GATE C: viewer and subadmin cannot execute commands or write files | sem privilégio × 6 rotas | ✔ |
| 9 | GATE C: admin terminal runs only allowlisted commands without a shell | injeção (`;`, `&&`, `|`, crase, `$()`, `node -e`, `rm -rf`, `curl`, `git -c`), cwd fora | ✔ |
| 10 | GATE C: admin file edit and revert are confined to the workspace | escrita, exclusão por revert, checkpoint, path traversal, `.env.production` | ✔ |
| 11 | GATE C: route-table sweep | **341 rotas de escrita** extraídas do código: viewer 403 e anônimo 401/403 em todas; + 4 rotas dinâmicas | ✔ |
| 12 | GATE D: no secret files are tracked by git | `git ls-files` | ✔ |
| 13 | GATE D: secret vault fails closed without FENIX_VAULT_KEY | cofre | ✔ |
| 14 | GATE E: backups, dotfiles and sibling paths are never served statically | 8 caminhos | ✔ |
| 15 | GATE E: production health hides internal topology | health | ✔ |
| 16 | GATE E: production compose pins FENIX_ENV=production for api and worker | artefato de deploy | ✔ |
| 17 | fatal handler logs safely, closes resources and exits non-zero | falhas globais, mascaramento de segredos | ✔ |

**Total: 17/17.** Os 17 falhavam antes das correções (execução registrada).

Exclusão operacional: o teste de exclusão de arquivos é coberto por `files/revert` e `create_checkpoint` (as únicas operações do Reality Operator que sobrescrevem/criam arquivos); não existe rota de `DELETE` de arquivo no Reality Operator.

## 2. Testes obrigatórios do CLAUDE.md

| Teste | Resultado |
|---|---|
| `node grg/test/architecture-guard.test.js` | ✔ "ARCHITECTURE GUARD PASSED" (exit 0) |
| `node grg/test/frontend-honesty.test.js` | ✔ 23/23 |
| `node grg/test/frontend-runtime-safety.test.js` | ✔ 5/5 |

## 3. Testes de regressão direcionados

`auth.test.js`, `level1-security.test.js`, `security-governance.test.js`, `e2e-http.test.js`, `compose-runtime-env.test.js`, `deployment-secret-boundaries.test.js`, `production-deploy.test.js`:
- 1ª execução: 71/73. As 2 falhas **já falhavam antes do LEVEL 1**:
  - `runtime and deployment configuration never embed provider or bootstrap credentials` → causada por uma chave `ap_live_…` versionada em `memory/ACTIVE_PROJECT_MEMORY.md`; **corrigida no LEVEL 1** (chave removida de 4 arquivos) e reexecutada: ✔.
  - `production fails closed for missing or development deploy adapters` → preexistente, fora do escopo (deploy adapters); permanece.
- Reexecução após os ajustes finais (`deployment-secret-boundaries`, `compose-runtime-env`, `level1-security`, `auth`): **42/42**.

## 4. Suíte completa (`test/*.test.js`)

| | Auditoria (antes) | Depois do LEVEL 1 |
|---|---|---|
| Testes | 1.879 | 1.940 (+17 novos de segurança; os demais passaram a rodar) |
| Passaram | 1.485 | **1.836** |
| Falharam | 391 | **101** |
| Cancelados | 2 | 2 |
| Pulados | 1 | 1 |

- **292 testes que falhavam passaram a passar** (principalmente pela correção de `security/config.js`).
- **2 testes passaram a falhar** — investigados, não são regressão do LEVEL 1:
  1. `World Reality Restoration 14-Step Playwright E2E` — estourou 240 s sob carga da suíte paralela; **isolado passou** ✔.
  2. `V6.2 — Real Execution Probes…` — depende do `codex` CLI instalado nesta máquina e de um timeout de 4 s: sob carga a 1ª sondagem falha e a 2ª passa, e o teste espera um failover que não ocorre. O módulo testado (`services/rea-intelligence-engine.js`) não usa nenhum arquivo alterado. Reproduzido isoladamente com depuração. Instável por ambiente.
- As 101 falhas restantes já existiam e pertencem ao LEVEL 2 (estabilidade).

## 5. Higiene da execução

A suíte grava em diretórios reais (BUG-025). Depois de cada execução o estado foi comparado com o registrado antes do LEVEL 1 e os efeitos colaterais foram revertidos (ver `LEVEL1_SECURITY_REMEDIATION.md` §5). Estado final de `grg/data`, `grg/runtime` e `grg/memory` idêntico ao anterior, exceto pela remoção intencional de `grg/memory/.secrets-vault.json` do índice.