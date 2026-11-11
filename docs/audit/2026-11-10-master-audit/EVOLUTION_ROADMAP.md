# EVOLUTION_ROADMAP — FÊNIX OS

Data: 2026-11-10. Cada nível só começa quando os critérios de conclusão do anterior estão provados. IDs referem-se a `BUG_TRACKER_MASTER.md` (BUG-xxx) e `IMPROVEMENT_OPPORTUNITIES.md` (OP-xx).

---

## LEVEL 1 — Correção de falhas críticas
- **Objetivo:** nenhuma forma de obter admin ou executar comandos sem credencial; segredos fora do git; produção em modo production.
- **Problemas:** BUG-001, 002, 003, 004, 005, 006, 007, 009, 016, 017, 029.
- **Arquivos:** `grg/src/auth/auth.js`, `grg/src/server.js`, `grg/src/api/universal-system-routes.js`, `grg/src/reality-operator/reality-operator-kernel.js`, `grg/src/security/config.js`, `grg/src/security/secret-vault.js`, `grg/.secrets/`, `grg/memory/.secrets-vault.json`, `grg/diag.sh`, `grg/docker-compose.enterprise.yml`, `grg/public/*.bak`, `grg/public/index_frozen_backup.html`.
- **Dependências:** acesso à VPS e aos painéis dos provedores para rotação de chaves (ação do dono).
- **Alterações:** apagar backdoor; desabilitar/limitar dev-session; `authorize` + allowlist nas rotas de terminal/arquivo; reverter `security/config.js`; `FENIX_ENV=production`; untrack + rotação de segredos; `uncaughtException` → exit; vault falha fechado; remover backups públicos.
- **Testes obrigatórios:** novos testes HTTP de autorização (preview, viewer, anônimo) para as rotas críticas; `auth.test.js` verde; teste de repositório sem segredos; os 3 testes do CLAUDE.md.
- **Evidências:** saída dos testes; `curl` de produção mostrando `production`, 404 em dev-session, 404 nos backups; registro de rotação de chaves.
- **Conclusão:** 0 rotas de escrita/execução sem `authorize` (teste que varre a tabela de rotas); `/health` = production sem echo; `git ls-files` sem segredos.

## LEVEL 2 — Estabilização arquitetural
- **Objetivo:** suíte confiável e verde; dados íntegros sob concorrência; falhas visíveis.
- **Problemas:** BUG-008, 010, 011, 012, 014, 015, 025, 026, 027, 028.
- **Arquivos:** `server.js` (ordem de despacho), `api/project-*-routes.js`, `execution/fenix-worker.js`, `ai-runtime/model-orchestrator.js`, `missions/workers/*`, `routing/model-router.js`, `memory/knowledge-genome.js`, `test/*` (diretórios temporários), `.github/workflows/fenix-ci.yml`, `CLAUDE.md` (Regra V).
- **Alterações:** rotas atrás de auth; `store.update` em todos os pontos; remover sucessos fabricados; testes em `os.tmpdir()`; limpeza de `.data`; um procedimento de deploy documentado; imagem imutável.
- **Testes:** concorrência (20 escritas simultâneas), falha de provedor → job FAILED, CI com Playwright instalado.
- **Evidências:** relatório da suíte ≥ 95%; CI verde; diff do CLAUDE.md.
- **Conclusão:** suíte ≥ 95% localmente e no CI; nenhum teste escreve em `grg/data`/`grg/.data`; deploy reproduzível a partir de uma tag.

## LEVEL 3 — Unificação dos módulos
- **Objetivo:** uma implementação por responsabilidade.
- **Problemas:** BUG-019, 020, 021, 024; duplicações de MODULE_INVENTORY §4.
- **Arquivos:** `execution/job-queue-manager.js` → `runtime/job-engine.js`; `ai/model-router.js`, `routing/model-router.js`, `ai-runtime/model-orchestrator.js`, `cognition/`, `infrastructure/ai-gateway/` → `ai-runtime/ai-router.js`; `projects/project-registry.js` → `projects/project-kernel.js`; `core/Kernel.js`; estado da cidade → `ai-city/ai-city-projection.js`; diretórios mortos.
- **Dependências:** LEVEL 2 (suíte confiável para refatorar com segurança).
- **Testes:** contrato de cada componente canônico; teste de 2 tenants; teste de 2 processos/1 fila.
- **Conclusão:** 1 fila, 1 roteador, 1 registro de projetos, 1 produtor de estado da cidade; diretórios mortos removidos; nenhum vazamento entre tenants.

## LEVEL 4 — Funcionalidade real de todos os subsistemas
- **Objetivo:** tudo que aparece na UI executa de verdade ou é removido.
- **Problemas:** BUG-013, 030, 031, 032; itens VISUAL/MOCK do FUNCTIONALITY_REALITY_REPORT.
- **Arquivos:** `agents/dynamic-pool-manager.js`, `orchestrator/autonomous-job-orchestrator.js`, `public/project-hub-*.js`, `public/fenix-operational-os.js`, `public/observatory-client.js`, `public/fenix-city-adaptive-dock.js`, `public/fenix-flow-graph.js`, `index.html` (botões com `alert`).
- **Testes:** teste estático "todo fetch aponta para rota existente"; `frontend-honesty-audit` ampliado para fallbacks numéricos; E2E por fluxo (criar missão → job → resultado visível).
- **Conclusão:** 0 itens MOCK/VISUAL no relatório de realidade (refeito); 0 chamadas a rotas inexistentes.

## LEVEL 5 — Otimização de IA e infraestrutura
- **Objetivo:** custo e qualidade sob controle.
- **Problemas:** BUG-018, 022, 023; OP-06..09.
- **Arquivos:** `ai-runtime/provider-registry.js` (OpenRouter), `ai-runtime/ai-router.js` (lanes), `ai-runtime/ai-gateway.js` (preços/orçamento), `memory/embedding.js`, `infrastructure/database/postgres-store.js` (tabelas para coleções quentes).
- **Testes:** contrato por provedor (opcional com chaves), recall de RAG em conjunto de referência, carga de escrita.
- **Evidências:** custo por tarefa e latência p95 por lane antes/depois; p95 de escrita.
- **Conclusão:** 100% das chamadas pelo gateway; orçamento aplicado por tenant; p95 de escrita < 50 ms; recall de RAG medido e acima de linha de base definida.

## LEVEL 6 — Evolução da experiência visual
- **Objetivo:** UI consistente, rápida e acessível.
- **Problemas:** BUG-033, 034, 035, 036, 037.
- **Arquivos:** `public/index.html`, CSS (`fenix-responsive.css`, `fenix-hig-system.css`, `fenix-window-overrides.css`, `city-*.css`), `fenix-world-3d.js`, `fenix-spatial-city.js`, `unreal-world-live.js`.
- **Testes:** QA de navegação autenticado em CI; testes visuais por viewport; contagem de `!important` e de loops ativos como métrica.
- **Conclusão:** QA de navegação passa em 3 viewports; `!important` reduzido em ≥ 70%; nenhum intervalo/rAF ativo fora da view; navegação completa por teclado.

## LEVEL 7 — Automação e autonomia dos agentes
- **Objetivo:** agentes produzem mudanças úteis com prova e aprovação.
- **Pré-requisito:** LEVEL 4 (sem simulação) e LEVEL 5 (custo controlado).
- **Alterações:** pool de agentes → `agent.execute` + Safe Dev Pipeline; política de commit fora do LLM; ciclo detectar → propor → provar → aprovar; memória de engenharia com embeddings reais.
- **Testes:** missão de ponta a ponta num repositório de teste (criar branch, mudar código, rodar testes, produzir diff, aguardar aprovação).
- **Conclusão:** taxa de sucesso na 1ª tentativa e custo por missão medidos; 0 commits sem aprovação de política.

## LEVEL 8 — Escalabilidade e qualidade de produção
- **Objetivo:** operar com vários clientes com segurança.
- **Alterações:** limites de recursos no compose (api, worker, ollama, postgres); observabilidade (Prometheus já presente) com alertas; backups e teste de restauração; rate limit atrás de proxy; testes de recuperação (matar worker no meio do job); repositório enxuto (BUG-038).
- **Conclusão:** restauração de backup testada; SLO definido e medido por 30 dias; teste de caos básico passando; repositório < 100 MB.

---

## Status de execução

| Nível | Status | Data | Evidência |
|---|---|---|---|
| LEVEL 1 | **BLOQUEADO — código concluído; aguardando ações do proprietário** (rotação de segredos, verificação/implantação na VPS, TLS no OIDC) | 2026-11-10 | `LEVEL1_SECURITY_REMEDIATION.md`, `LEVEL1_SECURITY_TEST_RESULTS.md`, `LEVEL1_DEPLOYMENT_PLAN.md` |
| LEVEL 2 | não iniciado | — | ponto de partida: 101 testes falhando, BUG-008/010/011/039 |