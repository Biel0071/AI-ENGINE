# TASK_MEMORY.md — FÊNIX OS

> Uma entrada por tarefa concluída. Somente conhecimento reutilizável — nunca logs completos.

## TASK-2026-10-08-001 — Implantar Project Intelligence 20X (camada de índice)

- **WHAT_CHANGED**: criado `engine/projectIntelligence/` (lib.js, build.js, query.js, audit.js) + documentos derivados na raiz: PROJECT_STRUCTURE.md, PROJECT_SKELETON.md, PROJECT_GRAPH.md, SCREEN_REGISTRY.md, API_REGISTRY.md, INTEGRATION_REGISTRY.md, ACTION_REGISTRY.md, DECISION_MEMORY.md, ARCHITECTURE_MEMORY.md, TASK_MEMORY.md. Artefatos de máquina em `engine/projectIntelligence/output/` (skeleton.json, graph.json, metrics.json, index-cache.json, perf-history.json).
- **FILES_CHANGED**: apenas arquivos NOVOS; nenhum arquivo existente do core foi modificado/movido/apagado (REGRA ZERO cumprida).
- **WHY**: permitir CONSULTAR O MAPA → encontrar contexto → ler somente o necessário, com cache incremental por hash e invalidação por dependência.
- **TESTS**: `node engine/projectIntelligence/build.js` (2 execuções), `query.js api / who-uses / context-pack`, `audit.js --record`. Nenhum contrato público alterado → suítes existentes permanecem válidas (`cd grg && node --test test/`, `cd platform && node --test test/*.test.js`).
- **RESULT**: 988 arquivos indexados; 669 arestas IMPORTS resolvidas; 206 endpoints catalogados; cache hit rate 99,29% no segundo run; 0 vazamentos de segredos no índice.
- **BASELINE vs APÓS (medido)**: primeira construção completa ~558 ms; rebuild incremental ~366 ms com 979/986 arquivos reaproveitados. Comparação honesta: a leitura manual repetitiva do projeto (milhares de linhas por tarefa) é substituída por lookups de skeleton/graph em <50 ms. Ganho real de "time to understand" será medido pelo histórico em output/perf-history.json a cada `audit.js --record`.
- **KNOWN_RISKS**:
  - 115 BROKEN_REFERENCES detectadas — a maioria em `generated/` e `future/` (templates incompletos esperados) e 2 dinâmicas reais em `grg/src/software-factory/software-factory.js` (`./modules/${m}` — require dinâmico, não quebrado de fato). Verificar lista em PROJECT_GRAPH.md antes de qualquer limpeza.
  - Skeleton usa regex determinístico (não AST completa); para JS/TS avançado já existe `engine/codeIntelligence/tree-sitter-service.js` reutilizável.
  - Duplicações idênticas encontradas (hash): UiCard/UiDataTable/layout/page repetidos entre `generated/*` e `future/drafts/legacy-root/generated/*`; `crm/frontend/vite.config.js == vite.config.ts`. Classificadas como GENERATED/LEGACY — NÃO apagar sem confirmação (FASE 17: UNKNOWN nunca some sozinho).
- **NEXT_STEP**: integrar `build.js` ao fluxo pós-tarefa (EVOLUTION LOOP): após qualquer mudança, rodar `node engine/projectIntelligence/build.js && node engine/projectIntelligence/audit.js --record`; consultar `query.js context-pack "<tarefa>"` ANTES de abrir arquivos.

## TASK-2026-10-17-002 — Implantar Pool de Agentes Dinâmicos, Modal Cyberpunk Human-in-the-Loop e Motor Multi-Monitor Auto-Adaptativo no GRG SPACE

- **WHAT_CHANGED**:
  - `grg/src/agents/dynamic-pool-manager.js`: Gerenciador de escalonamento dinâmico de agentes (10 a 100+ instâncias), auto-scaling inteligente por carga/fila de missões, Human-in-the-Loop approval e sincronização com o WorldStateEngine 3D.
  - `grg/src/api/dynamic-pool-routes.js`: Rotas REST canônicas (`/api/v2/agents/pool`, `/api/v2/agents/pool/scale`, `/api/v2/agents/popups`, `/api/v2/agents/tasks/:taskId/approve`, `/api/v2/agents/tasks/:taskId/reject`, `/api/v2/agents/test-task`).
  - `grg/src/server.js`: Montagem transparente das rotas do pool dinâmico no servidor HTTP principal.
  - `grg/public/fenix-screen-adaptive.js` & `fenix-screen-adaptive.css`: Motor responsivo multi-monitor com detecção em tempo real de resolução, aspect ratio (Ultrawide 21:9/32:9, 4K, Desktop, Laptop, Tablet, Mobile), auto-ajuste de escala (`--fnx-ui-scale`), projeção 3D WebGL Three.js e pílula HUD de telemetria no topo.
  - `grg/public/fenix-task-modal.js` & `fenix-task-modal.css`: Modal cyberpunk de tarefas de alto nível visual, com cronômetro em tempo real, tokens/custo, botões de aprovação/rejeição e localização do agente no 3D com chime sintetizado via Web Audio API.
  - `grg/public/fenix-dynamic-agent-hud.js` & `fenix-dynamic-agent-hud.css`: Widget interativo de controle de escala (10, 20, 50, 100 agentes), toggle de auto-scale e disparo de tarefa de teste.
  - `grg/public/task-creator.js`: Integração com `FenixTaskModal` para acionamento visual imediato ao submeter missões e jobs.
  - `grg/public/index.html`: Inclusão dos novos estilos e scripts no shell principal.
- **TESTS**: Criado `grg/test/dynamic-pool-manager.test.js` com 7 testes unitários e de integração de rotas (100% PASS). Regressões validadas com `test/office.test.js` e `test/workforce.test.js` (11/11 testes verdes).
- **RESULT**: Sistema atende integralmente aos requisitos de pool dinâmico elástico (10-100+), pop-up cyberpunk na tela, auto-ajuste para múltiplos monitores e sincronia operacional no GRG Space.
