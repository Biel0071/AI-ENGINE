# ACTION_REGISTRY.md

Catálogo das ações que JÁ EXISTEM — o agente deve reutilizar antes de criar.

## Ações disparadas pelo frontend canônico (grg/public/app.js)

(nenhuma detectada)

## Ações-chave do núcleo (services montados em grg/src/app.js)

| Ação | Implementação real |
|---|---|
| sendMessage/avatar | `MasterAvatar.handle` → POST /api/avatar/message |
| createMission | `app.missions.create` → POST /api/missions |
| planMission | `app.missionPlanner.plan` → POST /api/missions/plan |
| runJob | `app.jobs.submit` → POST /api/runtime/jobs |
| inspectAgent | `app.inspection.inspect` → POST /api/inspections |
| connectProvider | `provider-registry.buildProvidersFromEnv` + /api/keos/adapters/ai |
| deploy | `app.deployer` (runtime/deployer.js) + /api/operations/deploys |
| rollback | `versionEngine.proposeRollback` → POST /api/rollbacks |
| cityMap/World | `app.aiCity.map` → GET /api/city |
| eventSearch | `app.eventStore.list` → GET /api/events |
| memorySearch | `MemoryEngine` → /api/memories/search |
| activateOperations | `operationalActivation.boot` → POST /api/operations/activate |

## Comandos de engenharia já disponíveis

- `cd grg && node --test test/` — suíte principal citada no CLAUDE.md
- `cd platform && node --test test/*.test.js` — 13 testes do control plane
- `npm run test:engine` — engine/tests
- `node engine/projectIntelligence/build.js` — rebuild incremental deste índice
- `node engine/projectIntelligence/query.js <cmd>` — consultas ao mapa sem ler arquivos
