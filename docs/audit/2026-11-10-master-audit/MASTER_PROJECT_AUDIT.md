# MASTER_PROJECT_AUDIT — FÊNIX OS

**Data:** 2026-11-10 · **Fase:** descoberta, auditoria e planejamento (sem implementação) · **Nota de maturidade:** 32/100 (ver `EXECUTIVE_SUMMARY.md`).

## 1. Como esta auditoria foi feita

| Etapa | O que foi feito |
|---|---|
| Mapeamento | Estrutura de `ai-engine/` e `C:\projetos\ai-engine-core`; métricas com `find`/`wc`/`git` |
| Investigação de código | Cinco frentes paralelas somente-leitura (arquitetura central, IA, frontend/AI City, segurança/estabilidade, testes/infra), cada uma obrigada a citar `arquivo:linha` |
| Verificação independente | As alegações de maior impacto foram reabertas e confirmadas pelo auditor principal (marcadas ✔) |
| Execução | Suíte completa `node --test` (1.879 casos, ~20 min, Node v22.22.0); os 3 testes obrigatórios do `CLAUDE.md` |
| Produção | Somente `GET` não autenticados em `https://209.50.241.22` (`/health`, `/`, arquivos estáticos, rotas `/api` → 401) |
| Restrições respeitadas | Nenhum arquivo de produto alterado; nenhum dado de produção alterado; nenhuma credencial usada ou impressa; nenhuma exploração testada |

**Efeito colateral e reparo:** a execução da suíte alterou `grg/data/assets-3d.json` e criou `grg/data/test-snapshot-workspace/`; ambos foram revertidos pelo auditor logo após a execução. Antes da suíte havia 6 entradas sujas em `grg/data` + `grg/runtime`; depois do reparo há 5 — uma entrada pré-existente deixou de aparecer como modificada, provavelmente porque um teste a regravou com o conteúdo do HEAD [HIPÓTESE; não foi possível identificar qual].

## 2. Respostas diretas às perguntas da auditoria

| Pergunta | Resposta curta | Onde está o detalhe |
|---|---|---|
| O que realmente existe? | 122 mil linhas de backend em 90 diretórios, 19 views, cidade 3D, stack Postgres/Redis/Qdrant/BullMQ/Keycloak/Ollama em Docker | `MODULE_INVENTORY.md`, `ARCHITECTURE_MAP.md` |
| O que realmente funciona? | Servidor e health em produção, JobEngine com DLQ, MissionKernel, gateway de IA, agente que escreve código e roda testes, Safe Dev Pipeline, cidade 3D com A* e dados do backend, SSE/WebSocket | `FUNCTIONALITY_REALITY_REPORT.md` |
| O que está quebrado? | Segurança (backdoor, preview admin, RCE), OIDC, 391 testes, PATCH autônomo, indexação do KnowledgeGenome, ≥10 chamadas do frontend, E2E de navegação | `BUG_TRACKER_MASTER.md` |
| O que está incompleto? | Controle de custo, RAG semântico, OpenRouter, Job Lane, Runtime Manager, isolamento de tenant, LivingRuntime fora do worker | `FUNCTIONALITY_REALITY_REPORT.md` |
| O que está duplicado? | Filas (2), roteadores de IA (8), registros de projetos (5), estado da cidade (≥4), memória (5), loop autônomo (3), roteadores do frontend (3), renderizadores da cidade (5) | `MODULE_INVENTORY.md` §4 |
| O que está mal arquitetado? | Documento JSON único; handler HTTP de ~1.600 linhas com despacho linear; Kernel que carrega todo arquivo; singletons globais sem tenant | `ARCHITECTURE_MAP.md` |
| O que consome recursos à toa? | Kernel carregando ~15 diretórios mortos; API e worker consumindo a mesma fila; 7 intervalos e 4 loops rAF fora da view; SSE duplicado; reescrita do documento inteiro a cada escrita; 460 MB de binários no git | `STABILITY_SECURITY_AUDIT.md`, `UI_UX_AUDIT.md` |
| O que impede qualidade de produção? | Segurança (P0), produção em `development`, suíte vermelha sem gate, modelo de dados, sucesso fabricado, deploy não reproduzível | `EXECUTIVE_SUMMARY.md` |
| Melhores oportunidades? | Fechar a superfície de ataque, unificar IA, eliminar fabricação, roteamento por lane com custo, tirar coleções do documento único | `IMPROVEMENT_OPPORTUNITIES.md` |

## 3. Pontos fortes reais (para preservar)

- `ai-runtime/` (AIRouter, AIGateway, provedores HTTP, guarda anti-fabricação, streaming Ollama).
- `runtime/job-engine.js` (claim persistido, heartbeat, reaper, retries com backoff, DLQ).
- `missions/mission-kernel.js` e `software-factory/safe-dev-pipeline.js`.
- `agents/agent-execution-runtime.js` (loop real escrever → testar → commitar).
- `fenix-world-3d.js`: A* real, raycast para inspeção, posições vindas do servidor, pausa em aba oculta.
- CI com CodeQL, Trivy, SBOM, ações fixadas por SHA e Dependabot.
- Cultura de "honestidade" já presente em partes do código (fast lane, `frontend-honesty-audit`, estados `—`/"Não medido").

## 4. Divergências entre documentação e realidade

| Documento | Afirma | Realidade |
|---|---|---|
| `CLAUDE.md` §1/Regra V | Deploy via `ai-engine/deploy.bat`, PM2 #17, porta 4410 | `deploy.bat` e PM2 desativados; produção em Docker atrás de proxy 443; 4410 não responde publicamente |
| `CLAUDE.md` Regra III | 14 views | 19 views |
| `CLAUDE.md` Regra II | sem valores fictícios | ≥10 fallbacks fictícios no frontend |
| Selos "ZERO-MOCK 100% Real" na UI | tudo real | pool de agentes, métricas e "Reality Gate 100%" simulados |
| Comentário em `runtime/worker.js:127-131` | LivingRuntime sem chamador | instanciado em `worker.js:57` |
| ~400 relatórios/certificações `.md` | vários "CERTIFIED"/"100%" | suíte com 391 falhas hoje |

## 5. Índice dos entregáveis

1. `MASTER_PROJECT_AUDIT.md` — este documento
2. `ARCHITECTURE_MAP.md`
3. `MODULE_INVENTORY.md`
4. `FUNCTIONALITY_REALITY_REPORT.md`
5. `AI_INFRASTRUCTURE_AUDIT.md`
6. `UI_UX_AUDIT.md`
7. `STABILITY_SECURITY_AUDIT.md`
8. `BUG_TRACKER_MASTER.md` (38 itens)
9. `IMPROVEMENT_OPPORTUNITIES.md` (20 oportunidades)
10. `EVOLUTION_ROADMAP.md` (LEVEL 1–8)
11. `TEST_COVERAGE_GAP_REPORT.md`
12. `EXECUTIVE_SUMMARY.md`

## 6. Próximo passo

Aguardar autorização para iniciar o **LEVEL 1** (correções P0). Nenhuma implementação foi feita nesta etapa.

## 7. LEVEL 1 — Security Recovery (2026-11-10)

Executado no workspace local. Resultado: **BLOQUEADO** (o código está corrigido e testado; faltam ações do proprietário).

| Gate | Estado | Evidência |
|---|---|---|
| A — Autenticação | ✅ no código | backdoor removido; sem credencial padrão previsível. Ressalva: OIDC por HTTP (R16) |
| B — Privilégios | ✅ | preview desligado por padrão e em produção; identidade fixa; somente leitura |
| C — Execução | ✅ | Reality Operator exige `runtime:admin`; allowlist sem shell; caminhos confinados; gate central de escrita; varredura de 341 rotas |
| D — Segredos | ✅ no estado do git / 🟠 rotação pendente | 9 arquivos fora do índice; chave `ap_live` removida; histórico ainda contém |
| E — Produção | ✅ no artefato / 🟠 VPS não verificada | compose fixa `production`; a VPS respondeu `development` |
| F — Testes | ✅ | 17/17 novos; 3 obrigatórios ok; suíte 1.836/1.940 (era 1.485/1.879) |
| G — Integridade | ✅ | alterações locais preexistentes preservadas (verificado linha a linha) |
| H — Auditoria | 🟠 | BUG-001/002/003/006/009/016/017/029 fechados no código; BUG-004/005/007 dependem do proprietário |

Relatórios: `LEVEL1_SECURITY_REMEDIATION.md`, `LEVEL1_SECURITY_TEST_RESULTS.md`, `LEVEL1_SECRET_ROTATION_CHECKLIST.md`, `LEVEL1_DEPLOYMENT_PLAN.md`, `LEVEL1_RESIDUAL_RISKS.md`.