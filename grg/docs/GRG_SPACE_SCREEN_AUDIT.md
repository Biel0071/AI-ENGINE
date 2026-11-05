# GRG SPACE — mapa funcional e auditoria das telas

Atualizado em 20/10/2026. Esta auditoria combina o shell de `public/index.html`, os loaders do frontend, o manifest e a verificação de contratos em `qa/screen-function-map.json`. “Contrato declarado” significa que o backend registra a rota; não comprova acesso autenticado ou resposta correta em produção. Rotas de ação aparecem no catálogo, mas o probe HTTP não as invoca.

Complemento posterior da mesma data: `docs/GRG_SPACE_FULL_SCREEN_MAP.md` registra uma navegação autenticada que montou as 15 rotas, achados de runtime divergentes e a inspeção read-only do catálogo local. As duas observações de sessão (login e sessão autenticada) são preservadas; não se presume autenticação estável entre refreshes.

## Resultado da auditoria

- **15 telas canônicas**, distribuídas em cinco domínios funcionais.
- **7 entradas principais** no menu depois de remover o atalho `Command`, que duplicava `World` porque `command` é uma rota legada para `city`.
- **35 associações tela–API** encontradas e declaradas pelo backend: 33 referências GET (27 URLs únicas) são consultadas por HTTP e duas rotas POST de ação são verificadas apenas estaticamente; 10 referências não têm correspondência textual direta nos assets analisados e precisam de reconciliação manual.
- O navegador conectado à VPS abriu a tela de login ao tentar acessar `/app#city`. Portanto a navegação autenticada e os dados em runtime estão **BLOCKED_AUTH**, não PASS. O mapa não declara essas telas funcionais em produção.
- A matriz detalhada de critérios e os defeitos observados ficam em `qa-results/screen-improvement-queue.json` e no backlog versionado `docs/GRG_SPACE_VISUAL_BUG_BACKLOG.md`.

## Mapa de telas

| Domínio | Rota | Entrada principal | Função | APIs declaradas (GET; POST de ação entre parênteses) |
|---|---|---|---|---|
| Command | `#city` | World | Cidade, agentes, prédios e estado visual do runtime | `/api/v2/city/state` |
| Command | `#agents` | Agents | Lista, estado e organização dos agentes | `/api/agents/panel`, `/api/agents/swarm`, `/api/v2/agents/live-states` |
| Command | `#operations` | Work | Missões, jobs e controles operacionais | `/api/fenix/missions`, `/api/fenix/jobs`, `/api/v2/jarvis/jobs` |
| Build | `#projects` | Build | Registro de projetos, workspaces e Screen DNA | `/api/v2/projects`, `/api/project-mirror/projects` |
| Build | `#ide` | Projeto/atalhos | Chat de código, edição e inspeção visual | `/api/dev/fs`, `/api/project-mirror` (`POST /api/v2/vision/inspect-element`, não invocado pelo probe) |
| Build | `#terminal` | Projeto/atalhos | Arquivos, terminal isolado e preview | `/api/dev/fs` (`POST /api/dev/terminal`, não invocado pelo probe) |
| Intelligence | `#memory` | Memory | Memória de engenharia, contexto e conhecimento visual | `/api/fenix/memory/search`, `/api/v2/memory/development` |
| Intelligence | `#knowledge` | Memory/atalhos | Publicações e conhecimento federado | `/api/knowledge-federation/publications` |
| Intelligence | `#mcp` | Atalhos/configuração | Providers e conectores MCP | `/api/connectors`, `/api/fenix/providers` |
| Intelligence | `#marketplace` | Memory/atalhos | Skills e conectores registrados no runtime | `/api/skills`, `/api/connectors` |
| Intelligence | `#flowgraph` | Memory/atalhos | Relações entre telas, agentes, jobs, memória e projetos | `/api/v2/living-city/agents`, `/api/v2/jobs`, `/api/missions`, `/api/v2/projects`, `/api/fenix/memory/graph`, `/api/v2/observatory/summary` |
| Infrastructure | `#runtime` | Control | Saúde dos serviços, workers e runtime | `/health`, `/api/v2/city/state` |
| Infrastructure | `#observability` | Control/atalhos | Métricas, eventos e séries de observabilidade | `/api/observability/metrics`, `/api/observability/series` |
| Infrastructure | `#project` | Atalho/infraestrutura | Project Mirror e arquitetura do projeto | `/api/project-mirror`, `/api/v2/projects` |
| Validation | `#browser` | Browser | QA visual e auditoria de interação | `/api/v2/frontend-reality/screens`, `/api/v2/frontend-reality/audit` |

As entradas principais do menu são World, Work, Build, Memory, Control, Agents e Browser. As demais rotas existem como telas internas e devem ser acessadas por ações/abas com contexto. A rota antiga `#command` permanece compatível e redireciona para `#city`; não é uma tela canônica. `#dna` e `#metrics` também são aliases para Knowledge e Observability.

## Defeitos e prioridades em acompanhamento

| Prioridade | Área | Estado/evidência | Próximo trabalho |
|---|---|---|---|
| P1 | Sessão e primeiro acesso na VPS | `BLOCKED_AUTH`; `/app#city` redirecionou ao login no navegador conectado | Revalidar após login autorizado: refresh, hash vazio, `#city` e `#command`; separar falha real de sessão de rota inicial |
| P1 | Cidade, Inspector e painéis | `UI-006`, `UI-007`, `UI-008`, `UI-037` e `UI-038` verificados localmente; `UI-013` corrigido localmente com teste modal/teclado e geometria 6/6; composição e câmera medidos nos quatro viewports. Inspector autenticado e conferência visual/VPS pendentes | Validar Inspector autenticado; capturar a composição corrigida e conferir na VPS após acesso autenticado |
| P1 | Chat e propostas de missão | `UI-017` corrigido localmente; missão agora usa ID/estado reais, histórico antigo é compatível e job sem ID não vira cartão | Validar na sessão autenticada da VPS; conferir o estado real do registro pendente já identificado no histórico |
| P1 | Sessão e dados reais do World | Backlog `UI-024`–`UI-026`: estado vazio e envio ao login foram observados em sessão anterior; produção ainda diverge do workspace | Com sessão válida, testar `/api/v2/auth/check`, estado do World, roster e renderização contínua |
| P1 | Evidência de runtime | `UI-028` corrigido: a fila não herda mais PASS de navegação quando os endpoints estão bloqueados | Atualizar probe e navegação somente com evidência atual; não promover `BLOCKED_AUTH` a PASS |
| P1 | Controles móveis da Cidade | `UI-011` verificado localmente; rótulos agora cabem em 375 px; VPS ainda não verificada | Conferir os mesmos controles na versão autenticada da VPS |
| P2 | Avatares e etiquetas | `UI-009`, `UI-010`, `UI-014` observados nas capturas | Comparar 375/768/1280/1920 px e priorizar legibilidade/ações sobre decoração |
| P2 | Contratos frontend/backend | `UI-029` observado: 10 rotas esperadas sem referência literal direta nos assets | Confirmar por loader/API client e associar teste ou corrigir contrato; não presumir endpoint quebrado |
| P2 | Screen DNA | `UI-012`, `UI-023`: catálogo pode contar observações sem screenshot atual | Preservar origem e data da captura; manter estados “não medido” distintos de telas verificadas |

Consulte o backlog para passos de reprodução, componente provável, testes e critérios de fechamento por ID. Correções locais não alteram automaticamente a VPS.

## Verificações desta atualização

- `npm run qa:screen-map` (20/10/2026 18:01) — 15/15 telas com view e contrato declarado; 35 associações tela–API; 22 referências a assets; 0 telas pendentes de revisão.
- `npm run qa:screen-plan` (20/10/2026 18:01) — plano read-only gerado para os cinco domínios e 15 telas. Uma gravação falhou transitoriamente com erro de I/O; a execução repetida gravou e validou o JSON.
- `npm run qa:screen-contracts` em `http://209.50.241.22:3000` às `2026-10-20T16:31:46Z` — 27 URLs GET: `/health` 200, 26 protegidas por autenticação, zero 404 e zero falhas de transporte; duas rotas POST listadas como não testadas.
- `npm run qa:frontend:fast` com Edge instalado, sem credenciais — VPS redirecionou para `GRG Serviços — Login`; 0 telas navegadas. Oito erros 401 no contexto sem sessão foram classificados como esperados; zero erro fatal de console, sem declarar fluxo visual autenticado como aprovado.
- `npm run qa:screen-readiness` (20/10/2026 18:01) — 15 telas, 5 domínios; autenticação bloqueia navegação; 27 GET avaliados (1 público, 26 protegidos), 0 ausentes; 2 ações POST não invocadas.
- `npm run qa:screen-queue` (20/10/2026 18:01) — 15 telas `BLOCKED_AUTH` e prioridade `P1`; 10 referências esperadas ainda sem correspondência literal no scanner. Sem PASS de navegação obsoleto.
- `node --test test/city-first-paint.test.js test/shell-startup-responsive.test.js` com Edge — **2/2 passaram** após a última alteração (20/10/2026; 38,1 s). Confirma Cidade como primeira pintura, entrada `/` mesmo com preferência local antiga em Memória, redirecionamento `#command → #city`, sidebar fechada em primeira visita e ausência de overflow horizontal na Memória em tablet/mobile/desktop.
- `node --test test/city-overlay-layout.test.js test/city-live-indicators.test.js test/city-operation-layout.test.js test/city-project-inspector-flow.test.js test/city-first-paint.test.js test/shell-startup-responsive.test.js` com Edge — **21/21 passaram** após as alterações de composição (20/10/2026; 86,5 s). Mede minimapa, HUD, Inspector, Biblioteca, Central de Operações e startup em 375/768/1280/1920 px; inclui colisão sidebar/drawer, exclusividade, fechamento, aviso do runtime e rota inicial.
- `node --test test/sidebar-mission-rendering.test.js` com Edge — **1/1 passou**; reproduz MISSION_LANE e JOB_LANE sem ID, recarrega histórico legado, mede overflow da sidebar e gera capturas do cartão de missão em 375/768/1280/1920 px.
- `node --test test/conversation-route-real-runtime.test.js test/task-modal-no-placeholder.test.js` — **18/18 passaram**; cobrem lane conversacional/proposta, confirmação explícita e ausência de placeholders de aprovação.
- Capturas locais: `docs/visual-evidence/2026-10-20/city-agent-inspector-375-verified.png`, `docs/visual-evidence/2026-10-20/city-media-panel-375-verified.png` e `docs/visual-evidence/2026-10-20/city-operations-drawer-375-verified.png`. O HTML estático mostrou HTTP 404 do runtime, portanto não certifica os fluxos autenticados.
- Reprodução adicional de `UI-007`: sidebar + drawer em 375 px se sobrepunham (`351 px` de drawer sobre `363 px` de sidebar). Após a correção, sidebar recolhe ao abrir drawer em mobile; teste confirmou chat fechado e drawer utilizável. Em 768/1280/1920 px, medições confirmaram coexistência sem interseção. Evidência: `docs/visual-evidence/2026-10-20/city-operations-after-mobile-chat-collision-fix.png`.
- `test/city-world3d-terrain.test.js test/world-camera.test.js` — **18/18 passaram** após o ajuste responsivo da câmera. Playwright/WebGL local registrou FOV/distância e capturas da Cidade em 375/768/1280/1920 px; viewport em mudança conserva o zoom relativo e não gerou erros JavaScript. Capturas e limitação do runtime registrados em UI-008.
- Regressão combinada (20/10/2026; 127,3 s): `node --check public/fenix-world-3d.js` e 10 arquivos de teste de Cidade/startup/câmera/agentes — **48/48 passaram**.
- Testes focados de shell, mapa, readiness, segurança do probe e primeira pintura passaram; validação completa do layout e runtime autenticado permanece pendente.
