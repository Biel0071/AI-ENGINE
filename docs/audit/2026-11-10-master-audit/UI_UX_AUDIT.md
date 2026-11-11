# UI_UX_AUDIT — FÊNIX OS

Data: 2026-11-10. Base: leitura do frontend canônico `ai-engine/grg/public/`, testes Playwright da suíte (executados) e resultados de QA arquivados. **Não houve sessão interativa autenticada no navegador** — por isso não há screenshots novos nesta auditoria.

## 1. Estrutura

| Item | Valor | Leitura |
|---|---|---|
| `index.html` | 8.474 linhas, ~585 KB servidos | muito grande para um shell; difícil de manter |
| Scripts | ~70 externos + ~20 inline; 2 síncronos (`unified-app.js`, `fenix-evolve.js`) | o parse bloqueia no meio do documento |
| Folhas de estilo | 50 links em 3 lugares do documento; `city-layout-v3.css` 2× | ordem de cascata frágil |
| `!important` | **8.270** em 53 arquivos CSS | camadas de remendo (`fenix-responsive.css` 701, `fenix-hig-system.css` 538, `fenix-window-overrides.css` 450) |
| Breakpoints | 600, 639, 700, 760, 768, 820, 879, 900, 920, 1024, 1180, 1200, 1366… | sem escala única |
| Estilos inline | 1.503 atributos `style=` + 9 blocos `<style>` | |
| Views | 19 (`CLAUDE.md` diz 14) | documentação desatualizada |

## 2. Navegação

- Dono real: roteador inline (`index.html:6243-6394`), envolvido por `fenix-core-controller.js:630-650`.
- Restos concorrentes: `unified-app.js:145`, 2º roteador dormente (`fenix-core-controller.js:969-1039`), escritores de hash paralelos (`fenix-operational-os.js:2308`, `observatory-client.js:830`, `office-live.js:65`).
- `aria-current` aplicado ao item ativo (`fenix-core-controller.js:974`) — positivo.
- Último QA de navegação registrado (`qa-results/frontend-navigation-qa.json`, 2026-10-21): **bloqueado no login**, 0 controles exercitados.
- Suítes Playwright executadas hoje: Level 20/21/23, UNIFIED FRONTEND SUITE e Visual Recovery **falharam** por timeouts (30–240 s) e elementos ausentes ("found 0 KPI capsules").

## 3. AI City (2.5D/3D)

| Aspecto | Situação | Evidência |
|---|---|---|
| Motor | Three.js em `fenix-world-3d.js` (12.968 linhas), canvas próprio `#cityCanvas3D` | `:1629`, `:2645` |
| Pathfinding | **A\* real** com obstáculos e portas | `PathGraph :1098`, `findPath :1370-1479` |
| Origem das posições | telemetria do servidor + `/api/v2/autonomous/city-state` + eventos | `:2265-2291`, `:12612-12625`, `:12940-12957` |
| Interação | raycaster → inspector do agente; clique no chão define destino | `:1679`, `:8028-8047`, `:8086` |
| Profundidade | depth buffer WebGL + `renderOrder` pontual | — |
| Sprites/labels | texturas de canvas | `TextureFactory :230` |
| Pausa em aba oculta | sim | `:1743-1892` |
| Fallback 2D | `iso-city.js` em `#cityCanvas`; teste de fallback **falha** | — |
| Custo de GPU | teste "3D city rendering scales GPU cost… preserveDrawingBuffer should be disabled" **falha** | — |
| Colisão de lotes | teste "AMBIENT_CITY_LOTS has zero collision…" **falha** (lote "north-east" sobre "project-1") | — |
| Camadas paralelas | `fenix-spatial-city.js` (minimap com rAF próprio sem cancelamento), `unreal-world-live.js`, `city-reality-engine.js`, `premium-world-live.js` | 4+ loops/overlays simultâneos |

Para chegar a experiência premium: um único motor (3D + fallback 2D) com um único loop de render; minimap renderizado sob demanda; LOD por distância; animações de estado (trabalhando/ocioso/erro) dirigidas **somente** por eventos reais; inspeção com dados do job real, não do DOM.

## 4. Chamadas a endpoints inexistentes

| Chamada | Arquivo:linha | Backend |
|---|---|---|
| POST `/api/v2/runtime/tick` | `fenix-operational-os.js:394` | só `/api/runtime/tick` |
| `/api/v2/memory/trace-why` | `fenix-operational-os.js:865` | — |
| `/api/v2/memory/levels`, `/memory/experiences` | `fenix-operational-os.js:1814,1818` | — |
| `/api/v2/fenix/intelligence/analyze`, `/plan` | `fenix-operational-os.js:2691` | só `/intelligence/missions` |
| `/api/v2/observatory/search` | `observatory-client.js:503` | — |
| `/api/v2/observatory/element-inspector/observe` | `observatory-client.js:607` | só `/element-inspector` |
| `/api/v2/chat/send` | `index.html:6103` | — |
| `/api/v2/system/telemetry` | `iso-city.js:8134` | — (só no fallback 2D) |

## 5. Estados e feedback

- **Positivo:** muitos slots usam `—`/"Não medido"; formulários sem backend dizem "Endpoint não implementado" (honesto); falhas de leitura da cidade mostram retry manual.
- **Negativo:** `alert()` como feedback (Configurações, Criar perfil, Ver Log); valores padrão fictícios (`98%`, `|| 4`, `100%`, `68%`); selos "ZERO-MOCK 100% Real" estáticos, que afirmam algo que o código não garante.

## 6. Acessibilidade

| Item | Valor |
|---|---|
| `<button>` | 487 |
| `<div onclick>` / `<span onclick>` no HTML | 42 / 2 (+52 em templates JS) |
| `aria-label` | 78 |
| `role="button"` | 1 |
| `tabindex` | 4 |
| `outline:none/0` × `:focus-visible` | 77 × 48 |

→ ~96 elementos clicáveis não acessíveis por teclado; foco removido em vários controles, inclusive `#cityCanvas`.

## 7. Performance de renderização (frontend)

- 43 `setInterval` × 28 `clearInterval`; 34 rAF × 9 cancelamentos; 1.215 `addEventListener` × 31 remoções.
- 7 intervalos rodam independentemente da view ativa (lista em STABILITY_SECURITY_AUDIT §4).
- 2ª conexão SSE redundante em `fenix-spatial-city.js:2589`.
- `index.html` de 585 KB + ~70 scripts: [HIPÓTESE] primeiro carregamento lento em conexões móveis (não medido).

## 8. Arquivos públicos indevidos

✔ Servidos em produção sem login: `index_frozen_backup.html`, `fenix-world-3d.js.bak` (400 KB), `preview.html`, `release-manifest.json` (69 KB).

## 9. Prioridades de UX

1. Remover todos os fallbacks fictícios e selos "100% Real" (Regra II).
2. Corrigir as ~10 chamadas a endpoints inexistentes (ou remover a UI).
3. Fazer o QA de navegação autenticado passar e mantê-lo no CI.
4. Um motor de cidade, um loop; parar intervalos/rAF fora da view ativa.
5. Consolidar CSS: um design system, uma escala de breakpoints, eliminar camadas `*-overrides`/`*-fix`.
6. Trocar `div onclick` por `button`, restaurar foco visível.