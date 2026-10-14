# PROJECT_STRUCTURE.md — FÊNIX OS

Gerado automaticamente por `engine/projectIntelligence/build.js` em 2026-10-14T21:25:05.191Z. Derivado da realidade do código.

## Topo do repositório (6157 arquivos, sem node_modules/.git)

| Diretório | Arquivos | Finalidade (verificada no código) |
|---|---|---|
| `grg/` | 2938 | FÊNIX OS canônico — backend Node (src/server.js, porta 4400) + frontend canônico public/index.html (Live Workspace) + office.html |
| `archive/` | 1681 | A classificar |
| `projects/` | 307 | A classificar |
| `graphify-out/` | 240 | Grafo/AST cache gerados por ferramenta externa — regenerável |
| `generated/` | 205 | Saídas geradas pelo engine (smoke/dashboards) — NÃO editar |
| `engine/` | 103 | Motor de IA reutilizável (análise, AST tree-sitter, memória, codeIntelligence) |
| `ai-os/` | 92 | Documentos operacionais do FÊNIX (memória de decisões, prompts, repositórios registrados) |
| `future/` | 81 | Rascunhos/legado (legacy-root) — inativo |
| `docs/` | 76 | Documentação geral |
| `platform/` | 64 | Control Plane v2 legado do AI-ENGINE (porta 4310) — dashboard próprio em public/ |
| `executions/` | 38 | A classificar |
| `temp_artifacts/` | 31 | A classificar |
| `qa-results/` | 20 | A classificar |
| `memory/` | 17 | Memória de projetos (ai-engine, zapai-crm) |
| `ai-analysis/` | 14 | Análises congeladas (freeze) — gerado |
| `missions/` | 11 | A classificar |
| `system/` | 11 | Docs de sistema |
| `tests/` | 10 | A classificar |
| `scratch/` | 7 | A classificar |
| `clients/` | 5 | A classificar |
| `test-results/` | 4 | A classificar |
| `tmp/` | 4 | A classificar |
| `.agents/` | 3 | A classificar |
| `.claude/` | 3 | A classificar |
| `.codex/` | 3 | A classificar |
| `crm/` | 3 | CRM ZapAI (backend Baileys/WhatsApp + frontend Vite) — projeto satélite |
| `installer/` | 3 | A classificar |
| `.github/` | 2 | CI/CD (workflows) |
| `tasks/` | 2 | A classificar |
| `.cursorrules/` | 1 | A classificar |
| `.env.example/` | 1 | A classificar |
| `.gitignore/` | 1 | A classificar |
| `.secrets/` | 1 | A classificar |
| `ACTION_REGISTRY.md/` | 1 | A classificar |
| `AGENTS.md/` | 1 | A classificar |
| `API_REGISTRY.md/` | 1 | A classificar |
| `app-extensions.js/` | 1 | A classificar |
| `archaeology.js/` | 1 | A classificar |
| `ARCHITECTURE_MEMORY.md/` | 1 | A classificar |
| `CHANGELOG.md/` | 1 | A classificar |
| `check-parent.js/` | 1 | A classificar |
| `city_view.txt/` | 1 | A classificar |
| `CLAUDE.md/` | 1 | A classificar |
| `cmd.txt/` | 1 | A classificar |
| `DECISION_MEMORY.md/` | 1 | A classificar |
| `deploy-diagnose-vps.sh/` | 1 | A classificar |
| `deploy-direct.ps1/` | 1 | A classificar |
| `deploy-recover-qdrant-vps.sh/` | 1 | A classificar |
| `deploy-reset-qdrant-collection-vps.sh/` | 1 | A classificar |
| `deploy-run-compose-vps.sh/` | 1 | A classificar |
| `deploy-ssh.ps1/` | 1 | A classificar |
| `deploy-start-created-vps.sh/` | 1 | A classificar |
| `deploy-unified-front-vps.sh/` | 1 | A classificar |
| `deploy.bat/` | 1 | A classificar |
| `docker-compose.yml/` | 1 | A classificar |
| `editor_restore.txt/` | 1 | A classificar |
| `FAST_UNDERSTANDING_ENGINE.md/` | 1 | A classificar |
| `fenix-rc20-deploy.zip/` | 1 | A classificar |
| `fenix-unified-public.zip/` | 1 | A classificar |
| `fenix.manifest.json/` | 1 | A classificar |
| `FENIX_AGENT_MAP.json/` | 1 | A classificar |
| `FENIX_API_MAP.json/` | 1 | A classificar |
| `FENIX_API_SOURCE_OF_TRUTH.md/` | 1 | A classificar |
| `FENIX_ARCHITECTURE_GUARD.md/` | 1 | A classificar |
| `FENIX_ARCHIVED_FRONTENDS.md/` | 1 | A classificar |
| `FENIX_BASELINE.json/` | 1 | A classificar |
| `FENIX_BASELINE_BROWSER.png/` | 1 | A classificar |
| `FENIX_BRANCH_MAP.json/` | 1 | A classificar |
| `FENIX_CITY_SCREENSHOT.png/` | 1 | A classificar |
| `FENIX_CONSOLIDATION_REPORT.md/` | 1 | A classificar |
| `FENIX_CURRENT_STATE.json/` | 1 | A classificar |
| `FENIX_CURRENT_STATE.md/` | 1 | A classificar |
| `FENIX_DESIGN_SYSTEM.md/` | 1 | A classificar |
| `FENIX_FEATURE_MERGE_MATRIX.md/` | 1 | A classificar |
| `FENIX_FRONTEND_ARCHITECTURE.md/` | 1 | A classificar |
| `FENIX_FRONTEND_AUDIT_2026-09-01.md/` | 1 | A classificar |
| `FENIX_FRONTEND_INVENTORY.md/` | 1 | A classificar |
| `FENIX_PROJECT_MEMORY.json/` | 1 | A classificar |
| `FENIX_PROJECT_MEMORY.md/` | 1 | A classificar |
| `FENIX_REALITY_UPGRADE_REPORT.md/` | 1 | A classificar |
| `FENIX_REAL_AGENT_EXECUTION_REPORT.md/` | 1 | A classificar |
| `fenix_restored_city.png/` | 1 | A classificar |
| `FENIX_RUNTIME_MAP.json/` | 1 | A classificar |
| `FENIX_RUNTIME_TRUTH.json/` | 1 | A classificar |
| `fenix_stabilize_backup.zip/` | 1 | A classificar |
| `FENIX_SYSTEM_GRAPH.json/` | 1 | A classificar |
| `FENIX_SYSTEM_GRAPH.md/` | 1 | A classificar |
| `FENIX_SYSTEM_GRAPH.svg/` | 1 | A classificar |
| `FENIX_UI_GRAPH.json/` | 1 | A classificar |
| `FENIX_WORLD_ENGINE_STATUS.md/` | 1 | A classificar |
| `fix.js/` | 1 | A classificar |
| `fix_devpipeline.js/` | 1 | A classificar |
| `fix_enc.js/` | 1 | A classificar |
| `fix_fs.js/` | 1 | A classificar |
| `fix_js.js/` | 1 | A classificar |
| `FÊNIX_OS_REAL_VALIDATION_REPORT.md/` | 1 | A classificar |
| `GEMINI.md/` | 1 | A classificar |
| `generate_final_artifacts.js/` | 1 | A classificar |
| `generate_maps.js/` | 1 | A classificar |
| `grg-deploy.zip/` | 1 | A classificar |
| `inspect-process.js/` | 1 | A classificar |
| `INTEGRATION_REGISTRY.md/` | 1 | A classificar |
| `iso_engine.txt/` | 1 | A classificar |
| `LICENSE/` | 1 | A classificar |
| `list-nodes.js/` | 1 | A classificar |
| `map_builder.js/` | 1 | A classificar |
| `node.exe/` | 1 | A classificar |
| `package-lock.json/` | 1 | A classificar |
| `package.json/` | 1 | A classificar |
| `patch.js/` | 1 | A classificar |
| `patch.py/` | 1 | A classificar |
| `patch3.js/` | 1 | A classificar |
| `patch_backend.js/` | 1 | A classificar |
| `patch_backend.py/` | 1 | A classificar |
| `patch_html.js/` | 1 | A classificar |
| `patch_index2_js.js/` | 1 | A classificar |
| `patch_index_js.js/` | 1 | A classificar |
| `patch_jobs_backend.js/` | 1 | A classificar |
| `patch_jobs_html.js/` | 1 | A classificar |
| `patch_js.js/` | 1 | A classificar |
| `patch_logic.js/` | 1 | A classificar |
| `patch_pipeline.js/` | 1 | A classificar |
| `patch_reconnect.js/` | 1 | A classificar |
| `patch_registry.js/` | 1 | A classificar |
| `patch_routes.js/` | 1 | A classificar |
| `patch_sleep.js/` | 1 | A classificar |
| `patch_sleep2.js/` | 1 | A classificar |
| `patch_styles.js/` | 1 | A classificar |
| `patch_trigger.js/` | 1 | A classificar |
| `patch_trigger2.js/` | 1 | A classificar |
| `patch_ui.js/` | 1 | A classificar |
| `patch_ui.py/` | 1 | A classificar |
| `patch_ui2.py/` | 1 | A classificar |
| `patch_ui_v2.js/` | 1 | A classificar |
| `playwright.config.js/` | 1 | A classificar |
| `playwright_test.js/` | 1 | A classificar |
| `PROJECT_GRAPH.md/` | 1 | A classificar |
| `PROJECT_SKELETON.md/` | 1 | A classificar |
| `PROJECT_STRUCTURE.md/` | 1 | A classificar |
| `puppeteer_test.js/` | 1 | A classificar |
| `qa-screenshot-city.png/` | 1 | A classificar |
| `qa-screenshot-ide-final.png/` | 1 | A classificar |
| `qa-screenshot-inspector.png/` | 1 | A classificar |
| `query-parent-owner.js/` | 1 | A classificar |
| `README.md/` | 1 | A classificar |
| `real_server_log.txt/` | 1 | A classificar |
| `remote-setup.sh/` | 1 | A classificar |
| `renderCity_fix.txt/` | 1 | A classificar |
| `restart-helper.js/` | 1 | A classificar |
| `result.log/` | 1 | A classificar |
| `resume-setup.sh/` | 1 | A classificar |
| `schemas/` | 1 | A classificar |
| `scratch_add_project.js/` | 1 | A classificar |
| `scratch_backend_jobs.js/` | 1 | A classificar |
| `scratch_fix_devpipeline.js/` | 1 | A classificar |
| `scratch_fix_project.js/` | 1 | A classificar |
| `scratch_fix_queue.js/` | 1 | A classificar |
| `scratch_patch_html3.js/` | 1 | A classificar |
| `scratch_patch_routes.js/` | 1 | A classificar |
| `scratch_patch_sleep.js/` | 1 | A classificar |
| `scratch_patch_trigger.js/` | 1 | A classificar |
| `scratch_patch_worker.js/` | 1 | A classificar |
| `scratch_patch_worker2.js/` | 1 | A classificar |
| `scratch_reconnect.js/` | 1 | A classificar |
| `scratch_test_fix.js/` | 1 | A classificar |
| `screenshots/` | 1 | A classificar |
| `SCREEN_REGISTRY.md/` | 1 | A classificar |
| `scripts/` | 1 | Scripts utilitários (analyze-crm) |
| `server.js/` | 1 | A classificar |
| `server_crash_log.txt/` | 1 | A classificar |
| `skill-global/` | 1 | A classificar |
| `TASK_MEMORY.md/` | 1 | A classificar |
| `temp-runtime-city.png/` | 1 | A classificar |
| `temp.js/` | 1 | A classificar |
| `temp_fenix_async_final.png/` | 1 | A classificar |
| `temp_fenix_defer_final.png/` | 1 | A classificar |
| `temp_fenix_digital_company_evolution_browser_authenticated.png/` | 1 | A classificar |
| `temp_fenix_digital_company_evolution_browser_evidence.json/` | 1 | A classificar |
| `temp_fenix_digital_company_evolution_browser_nav.png/` | 1 | A classificar |
| `temp_fenix_digital_company_evolution_browser_simple_app.json/` | 1 | A classificar |
| `temp_fenix_digital_company_evolution_browser_simple_app.png/` | 1 | A classificar |
| `temp_fenix_digital_company_evolution_final_app.json/` | 1 | A classificar |
| `temp_fenix_digital_company_evolution_final_app.png/` | 1 | A classificar |
| `temp_fenix_direct_final.png/` | 1 | A classificar |
| `temp_fenix_head_final.png/` | 1 | A classificar |
| `temp_fenix_hydrated_stage.png/` | 1 | A classificar |
| `temp_fenix_layout_final.png/` | 1 | A classificar |
| `temp_fenix_loop_stage2.png/` | 1 | A classificar |
| `temp_fenix_no_monaco.png/` | 1 | A classificar |
| `temp_fenix_ordered_final.png/` | 1 | A classificar |
| `temp_fenix_priority_snapshot.png/` | 1 | A classificar |
| `temp_fenix_single_final.png/` | 1 | A classificar |
| `temp_fenix_stage_iteration.png/` | 1 | A classificar |
| `temp_fenix_timeout_final.png/` | 1 | A classificar |
| `temp_fenix_visual_5col_real_jobs.png/` | 1 | A classificar |
| `temp_fenix_visual_after_size.png/` | 1 | A classificar |
| `temp_fenix_visual_test.png/` | 1 | A classificar |
| `temp_fenix_visual_verified.png/` | 1 | A classificar |
| `temp_views.txt/` | 1 | A classificar |
| `test-api.js/` | 1 | A classificar |
| `test-browser.js/` | 1 | A classificar |
| `test-ollama.sh/` | 1 | A classificar |
| `test-vps-unreal.sh/` | 1 | A classificar |
| `test_server.log/` | 1 | A classificar |
| `trigger-restart.js/` | 1 | A classificar |
| `tsconfig.engine.json/` | 1 | A classificar |
| `tsconfig.json/` | 1 | A classificar |
| `{/` | 1 | A classificar |

## Entrypoints reais

- **Backend canônico**: `grg/src/server.js` → `grg/src/app.js` (composition root). Porta padrão `4400` (env PORT).
- **Frontend canônico**: `grg/public/index.html` (+ `app.js`, `design-system.css`, `fenix.css`, `city-overrides.css`, `office.css`). Servido estaticamente por server.js. Rota alternativa: `/office` → `grg/public/office.html`.
- **Login**: `grg/public/login.html` (`/GRG-login`).
- **Control Plane legado**: `platform/src/index-v2.js` (porta 4310, http/server-v2.js).
- **Engine CLI**: `package.json` bin `ai-engine` → `cli/index.js`; scripts: analyze:project (engine/runAnalysis.js), test:engine.
- **Worker/agendamento**: schedules garantidos no boot do grg server; execução via `/api/runtime/work` e BullMQ (grg/src/infrastructure/queue/bullmq-runtime.js).
- **Deploy**: `grg/Dockerfile`, `grg/docker-compose.enterprise.yml`, `grg/start.sh`, `grg/ops/*` (backup/restore/rollback/healthcheck/observability/keycloak/reverse-proxy), compose raiz (qdrant + docling).

## Classificação estrutural (FASE 16)

| Classe | Arquivos |
|---|---|
| ACTIVE | 4231 |
| GENERATED | 453 |
| TEST | 394 |
| LEGACY | 76 |
| TEMPORARY | 1 |

## Configuração

- `.env` (raiz): chaves PORT, FRONTEND_URL, OPENAI_API_KEY(redacted), DATABASE_URL, DEFAULT_COMPANY_ID, AI_ENGINE_CMD, ENGINE_MONITOR_INTERVAL_MS — valores nunca indexados.
- `grg/src/infrastructure/config.js`: carrega Postgres/Redis/S3/Qdrant opcionais.
- `grg/src/security/config.js+: política de segurança/bootstrap admin/OIDC.
- `docker-compose.yml`: serviços qdrant (6333) e docling (8000).

## Runtime

- Node >= 18 (testado em v20). Testes: `cd grg && node --test test/` (suite principal), `cd platform && node --test test/*.test.js`, `npm run test:engine`.
