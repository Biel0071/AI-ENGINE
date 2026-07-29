# FÊNIX Ω∞ — EVENT ARCHITECTURE

Como os eventos fluem hoje. A fonte de eventos existe e é rica; o que falta é só o último
salto até o browser (RC2). Medido, sem mock.

## As três camadas de evento (existem — MISSION-0002 provou que são camadas, não duplicação)

```
EventBus            (kernel/event-bus.js)       pub/sub in-process, efêmero
   │  emit(type, payload) / subscribe(type, fn)
EventStore          (eventing/event-store.js)   log durável: append/readStream, hash
FabricEventBus      (eventing/fabric-event-bus) compõe: append no store + emit no bus
```

`FabricEventBus.publish()` grava no store E emite no bus. Persistência e notificação
separadas de propósito — não fundir (Constituição, Princípio 5).

## Eventos que já são emitidos (amostra medida)

- `mission.started`, `mission.paused`, `mission.completed`, `mission.step.*`
- `runtime.job.succeeded` / `.failed` / `.cancelled`
- `connector.state.changed` (RC1)
- `ai.cache_hit`, `ai.provider_failed`
- `gatekeeper.action.blocked` / `.cleared`
- `organism.identity.established`, `organism.generation.recorded` (RC1)

A plataforma **já é orientada a eventos por dentro.** Todo estado relevante publica.

## O gap: do EventBus ao browser

```
EventBus (emite tudo)  ──?──►  browser
```

Hoje o browser NÃO assina o EventBus — ele faz polling das 13 APIs a cada 5s
(`SYSTEM_INTEGRATION_MATRIX.md`). O `?` é o transporte que não existe: SSE ou WebSocket.

## A ponte planejada (RC2, não implementada)

```
EventBus ──► /api/events/stream (SSE) ──► EventSource ──► refresh cirúrgico da tela
```

Como o EventBus já emite tudo, a ponte SSE é fina: assinar o bus, filtrar por tenant,
empurrar `data:` por evento. Ver `EVENT_STREAM_PLAN.md`. É a MISSION-1010.

## Por que isto não é "arquitetura de evento nova"

A arquitetura de eventos **já existe e é completa** — três camadas, dezenas de tipos de
evento, tudo persistido. O que a RC2 adiciona não é event architecture; é um **transporte**
(SSE) sobre uma arquitetura de eventos que já está madura. A distinção importa: não estamos
criando o sistema de eventos, estamos dando a ele uma saída para o browser.

## Estado

Event architecture: **ATIVA e madura** (in-process + durável). Transporte ao browser:
**PLANNED** (RC2). Nenhuma mudança nesta Release Candidate.
