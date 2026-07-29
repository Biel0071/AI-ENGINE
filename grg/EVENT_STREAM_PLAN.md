# FÊNIX Ω∞ — EVENT STREAM PLAN (RC2)

Plano do único item ausente da integração: transporte em tempo real. **Nenhum código
escrito.** RC1 permanece em polling; o Event Stream é a MISSION-1010, pós-deploy.

## Estado atual (medido)

- Frontend: `setInterval(refresh, 5000)` — polling de 13 APIs a cada 5s (`SYSTEM_INTEGRATION_MATRIX.md`).
- Backend: `EventBus` in-process já emite eventos (`mission.started`, `connector.state.changed`,
  `ai.cache_hit`...). **A fonte de eventos já existe** — falta só o transporte até o browser.
- Ausente: `text/event-stream`, `server.on('upgrade')`, dependência de WebSocket. Zero.

## Comparação Polling × SSE × WebSocket

| | Polling (hoje) | SSE | WebSocket |
|---|---|---|---|
| Direção | cliente puxa | servidor empurra | bidirecional |
| Latência de atualização | até 5s | ~imediata | ~imediata |
| Complexidade | nenhuma (existe) | baixa (HTTP puro) | média (upgrade, ping/pong) |
| Reconexão | trivial (próximo ciclo) | nativa do EventSource | manual |
| Custo por cliente | 13 reqs/5s | 1 conexão aberta | 1 conexão aberta |
| Dependência nova | nenhuma | nenhuma (http nativo) | provável (`ws`) |
| Ajuste ao FÊNIX | — | **alto** (unidirecional serve; sem dep nova) | maior que o necessário |

**Recomendação: SSE.** O fluxo é servidor→cliente (o browser observa o runtime, não comanda
por socket). SSE é HTTP puro (o projeto usa `node:http` nativo, sem framework), sem
dependência nova, com reconexão nativa do `EventSource`. WebSocket seria mais poder do que o
caso pede e traria dependência.

## Arquitetura proposta (RC2, não implementada)

```
EventBus (existe) ──► /api/events/stream (SSE, NOVO) ──► EventSource no frontend
   emite eventos        empurra por tenant/escopo         atualiza a tela sem refresh
```

- Endpoint `GET /api/events/stream`: `Content-Type: text/event-stream`, assina o `EventBus`,
  filtra por tenant/permissão (mesma autorização das outras rotas), envia `data:` por evento.
- Frontend: substitui o `setInterval(refresh, 5000)` por um `EventSource` que faz refresh
  cirúrgico do componente afetado; **mantém o polling como fallback** se o SSE cair.
- Heartbeat (comentário `:` a cada ~15s) para manter a conexão viva atrás de proxy.

## Impacto

- **Funcional:** nenhuma perda hoje — polling entrega o mesmo dado, só com até 5s de atraso.
- **Latência:** de até 5s para ~imediato quando o RC2 chegar.
- **Carga:** menos requisições (1 conexão vs 13 reqs/5s por cliente).

## Requisitos (RC2)

- Autorização por tenant no stream (reusar `security.begin` / controlPlane).
- Limite de conexões por tenant (evitar exaustão de sockets).
- Fallback para polling se `EventSource` indisponível ou conexão perdida.
- Sem quebrar as 13 APIs atuais — elas continuam servindo o fallback.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Proxy/Nginx bufferiza SSE | `X-Accel-Buffering: no` + heartbeat |
| Conexões acumulando (leak) | limite por tenant + cleanup no `close` |
| Cliente sem EventSource | fallback automático para polling |
| Evento vaza entre tenants | filtro de autorização no stream, testado |

## Estratégia de migração

1. Adicionar o endpoint SSE **ao lado** do polling (aditivo, não substitui).
2. Frontend tenta SSE; se falhar, cai no polling existente.
3. Observar latência/estabilidade numa janela.
4. Só então considerar remover o polling — ou mantê-lo como fallback permanente.

## Rollback

Trivial: como o SSE é aditivo e o polling permanece como fallback, desligar o endpoint SSE
(ou o `EventSource` no frontend) volta ao comportamento atual sem perda. Nenhuma migração de
dado envolvida.

## Fronteira

Este documento é desenho. A implementação é a MISSION-1010 (RC2), sobre a RC1 já deployada.
Nenhuma alteração em `server.js`, `app.js` ou runtime nesta Release Candidate.
