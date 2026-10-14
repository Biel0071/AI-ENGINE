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
