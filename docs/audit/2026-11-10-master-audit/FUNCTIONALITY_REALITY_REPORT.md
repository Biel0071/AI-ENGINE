# FUNCTIONALITY_REALITY_REPORT — FÊNIX OS

Data: 2026-11-10. Classificação: **REAL** · **PARCIAL** · **VISUAL** · **MOCK** · **QUEBRADA** · **DUPLICADA** · **AUSENTE**.
Base de evidência: código, suíte de testes executada (1.485/1.879 passando) e sondagem não autenticada da produção.
**Limite importante:** fluxos autenticados em produção **não** foram exercitados (não usamos credenciais). "REAL" significa: código completo + teste passando ou evidência em produção.

## 1. Plataforma

| Funcionalidade | Classe | Evidência |
|---|---|---|
| Servidor HTTP + health | REAL | ✔ `https://209.50.241.22/health` → `ready`, Postgres/Redis/Qdrant/BullMQ ok |
| Login usuário/senha | REAL + **falha grave** | `/api/login` existe; backdoor em `auth/auth.js:107-115` |
| Login OIDC (Keycloak) | PARCIAL | verificador existe; teste "rejects insecure endpoints and unsigned identities" **falha** |
| Bloqueio de `/api` sem sessão | PARCIAL | ✔ produção devolve 401; mas ~15 rotas são atendidas antes do bloqueio e 3 famílias recebem identidade fabricada |
| Sessão de preview | QUEBRADA (segurança) | concede papel do vínculo existente (ver STABILITY_SECURITY_AUDIT S2) |
| Multi-tenant | PARCIAL | store chaveado por tenant; GraphBrain, AgentRegistry, PatternLibrary, WebSocket e singletons de rota não |
| Persistência | REAL (frágil) | documento JSON único (Postgres em produção) |
| Fila de jobs (JobEngine + BullMQ) | REAL | retries + DLQ (`runtime/job-engine.js:274-275`); testes de DLQ falham hoje pela causa de configuração |
| Fila paralela (JobQueueManager) | DUPLICADA | `execution/job-queue-manager.js` |
| Recuperação após reinício | PARCIAL | só JobEngine re-enfileira; demais "runs" ficam RUNNING |
| WebSocket / SSE | REAL | `live-runtime.js` com reconexão; SSE compartilhado; sem filtro de tenant no fan-out |
| Deploy | PARCIAL / DUPLICADA | compose enterprise real; scripts PM2/`deploy.bat` aposentados mas citados como canônicos |

## 2. IA

| Funcionalidade | Classe | Evidência |
|---|---|---|
| Chat com LLM (SSE) | PARCIAL | streaming real; em produção o provedor de geração externo está offline e `echo` está ativo |
| Seleção automática de modelo | PARCIAL / DUPLICADA | AIRouter real por tier; 7 roteadores concorrentes; 2 deles sempre devolvem qwen2.5:3b |
| Fallback entre provedores | REAL no gateway / MOCK em 6+ módulos | `fenix-worker.js:164-175` devolve sucesso fabricado |
| Controle de custo | VISUAL | orçamento nunca configurado; tabela de preços fictícia |
| Cache de prompts | REAL | sem evicção |
| RAG / busca vetorial | PARCIAL | Qdrant real, embeddings por hash; cápsulas nunca indexadas (bug de assinatura) |
| OpenRouter | AUSENTE | só nome |
| "Qwen / Antigravity / Claude" como agentes | VISUAL | rótulos em `dynamic-pool-manager.js` |
| Agente que edita código e roda testes (`agent.execute`) | REAL | `agents/agent-execution-runtime.js`; testes falham hoje pela causa de configuração |
| Safe Dev Pipeline (worktree + diff) | REAL | `software-factory/safe-dev-pipeline.js` |
| Orquestrador autônomo PATCH | QUEBRADA (destrutiva) | sobrescreve arquivo inteiro sem enviar o original ao LLM |
| Pool dinâmico de agentes / aprovação de tarefa | MOCK | `setTimeout(3500)` marca concluída |
| Métricas de eficiência/CPU de agentes | MOCK | `Math.random` em 4 módulos |
| "Reality Gate 100%" no orquestrador | MOCK | log fixo |
| Mission workers sem roteador | MOCK | `simulatedLLM:true` com sucesso |

## 3. Núcleo do FÊNIX

| Componente | Classe |
|---|---|
| MissionKernel | REAL |
| JobEngine | REAL |
| Kernel (`core/Kernel.js`) | VISUAL (ativação no-op; flag do health) |
| AgentRegistry | PARCIAL / DUPLICADA |
| Memory Fabric | PARCIAL (1 provedor real; 2 stubs) |
| Graph Brain | PARCIAL (global, sem tenant, sem lock) |
| Project Registry | DUPLICADA (array fixo + 4 outras fontes) |
| Project Mirror | REAL |
| Project DNA | PARCIAL (valores padrão fixos) |
| Pattern Library | PARCIAL (só memória) |
| Visual Engine | AUSENTE na prática (código morto) |
| AI Gateway | REAL |
| Model Router | DUPLICADA |
| Fast Lane | PARCIAL (só chat) |
| Job Lane | AUSENTE (apenas contador) |
| Runtime Manager | AUSENTE |
| AI City backend | REAL / DUPLICADA |
| LivingRuntime | PARCIAL (só no worker) |
| FenixAutonomousLoop | REAL / DUPLICADA |

## 4. Frontend

| Funcionalidade | Classe | Evidência |
|---|---|---|
| 19 views com roteamento por hash | REAL | `index.html:6243-6394` |
| Cidade 3D com A*, clique para inspecionar, posições do backend | REAL | `fenix-world-3d.js:1098, 1370-1479, 2265-2291, 8086` |
| Fallback 2D (WebGL indisponível) | PARCIAL | teste "City falls back to the measured 2D renderer…" **falha** |
| Pilha `pixi-*` (6 arquivos), `fenix-world-engine.js`, `initCityCanvas` | MORTA | não carregados / não chamados |
| Botão Configurações | VISUAL | `alert(...)` em `index.html:1768` |
| "Criar novo perfil" | VISUAL | `alert` em `index.html:4847` |
| "Ver Log" do Project Hub | MOCK | `alert` com "100% de sucesso" (`project-hub-controller.js:1131`) |
| Git clone / AI edit / mover projeto / delegar pipeline (`index.html:7497-7526`) | AUSENTE (honesto) | mostra "Endpoint não implementado" |
| Contador de agentes no dock | MOCK | `… .length \|\| 4` ✔ (`fenix-city-adaptive-dock.js:844`) |
| Saúde de projeto | MOCK | `'98%'` como padrão ✔ (`project-hub-controller.js:401,413`) e em 3 outros arquivos |
| Catálogo de telas "VERIFIED REAL" | MOCK | `project-hub-controller.js:29-48` |
| Telas geradas quando projeto não tem telas | MOCK | `project-hub-live.js:2687-2859` com KPIs "98.4%", "99.9%" |
| Mini-dashboard do Flow Graph | MOCK | `fenix-flow-graph.js:3635` (1.4K / 98% / 180ms) |
| Selos "ZERO-MOCK 100% Real" | VISUAL | `index.html:2028` e 3 outros |
| Chamadas a endpoints inexistentes | QUEBRADA | ≥10 (ver UI_UX_AUDIT §4) |

**Contradição com a Regra II do CLAUDE.md:** os itens MOCK acima violam "proibido colocar valores fictícios"; o teste `frontend-honesty` passa porque não detecta fallbacks em expressões (`|| 4`, `: '98%'`).

## 5. Itens que não puderam ser classificados

- Fluxos autenticados em produção (chat real, criação de missão, agentes executando em projetos reais).
- Integrações Alexa/voz, dispositivos móveis, controle do computador (testes E2E dessas áreas falharam pela causa de configuração; sem evidência independente).