# FÊNIX Ω∞ — SYSTEM INTEGRATION MATRIX

O que o frontend REALMENTE consome, medido de `public/app.js` (não do que "deveria"). São
13 APIs de 195 rotas — o painel toca a superfície operacional viva; o resto é API sem
consumidor de UI (integração via API direta, não tela).

## APIs que alimentam o Frontend (medido)

| API | Consumidor | Tela / componente | Dados retornados | Estado |
|---|---|---|---|---|
| `/overview` | refresh 5s | topbar, métricas | tenant, contadores | ATIVO |
| `/operations/state` | refresh | Health Orchestrator, sidebar | componentes, readiness | ATIVO |
| `/missions` | refresh | Missão ativa | lista de missões | ATIVO |
| `/missions/avatar-state` | refresh | Avatar Mestre | estado/progresso | ATIVO |
| `/city` | refresh | AI City (distritos/prédios) | nós/arestas | ATIVO |
| `/runtime/jobs` | refresh | Fila e timeline | jobs | ATIVO |
| `/ai/telemetry` | refresh | AI Gateway (consumo) | chamadas/tokens/custo | ATIVO |
| `/performance/speed-score` | refresh | console bar | score derivado | ATIVO (RC1) |
| `/performance/hot-memory` | refresh | console bar | cache pré-aquecido | ATIVO (RC1) |
| `/connectors` | refresh | seção Conectores | estado derivado por selfTest | ATIVO (RC1) |
| `/workspace/mode` | boot | seletor de modo | modo atual | ATIVO |
| `/workspace/eca/inbox` | refresh | Executive Inbox | itens de decisão | ATIVO |
| `/workspace/eca/daily-brief` | boot | brief | resumo diário | ATIVO |

## APIs novas da RC1 já integradas ao painel

`/connectors`, `/performance/speed-score`, `/performance/hot-memory` — todas com estado
DERIVADO real (sem literal congelado, correção da MISSION-1003/V8). `/organism/identity` e
`/ai/router/select` existem como endpoint mas ainda não têm componente de tela — integração
de UI futura, não lacuna de backend.

## Como o frontend atualiza hoje

`public/app.js:289` — `setInterval(refresh, 5000)`. Polling. Cada ciclo faz
`Promise.allSettled` das 13 APIs e re-renderiza. Funciona; a latência é o intervalo (5s).
**Event Stream (sem refresh) é PLANNED** — ver `EVENT_STREAM_PLAN.md`.

## Leitura da matriz

O painel NÃO é um dashboard separado — é a superfície única que reflete o runtime real.
Toda API listada devolve estado medido (measured/unknown), nenhuma devolve mock. As telas
que faltam (identity, router/select) são adição de UI, não integração de backend ausente.
