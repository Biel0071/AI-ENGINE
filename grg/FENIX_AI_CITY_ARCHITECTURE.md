# FÊNIX AI City — arquitetura operacional

## Fonte de verdade

O runtime canônico é criado em `src/app.js`. O estado persistido passa pelo
store/control-plane; jobs, missões, agentes, aprovações e memória publicam
eventos no EventBus/FabricEventBus. A camada HTTP em `src/server.js` expõe o
runtime autenticado e a camada visual em `public/` apenas projeta esse estado.

## Fluxo

```text
store + registries → runtime kernels → EventBus/FabricEventBus
        ↓                                      ↓
 /api/v2/city/state                      /events (WebSocket)
        ↓                                      ↓
  unified shell / AI City ← fenix-city-event-adapter ← eventos reais
```

Não existe autorização para gerar atividade visual artificial em modo live.
Quando não há evento ou job ativo, a cidade deve permanecer calma.

## Integrações principais

- API: `GET /api/v2/city/state` e rotas autenticadas de runtime, missões e jobs.
- Eventos: WebSocket autenticado em `/events` e stream SSE em
  `/api/v2/events/stream`.
- Visual: `public/iso-city.js`, `public/fenix-city-event-adapter.js` e o shell
  unificado carregado por `public/fenix-bootstrap.js`.
- Operação: terminal, arquivos, Git, memória, skills e logs são apresentados
  pelo Agent Desk quando o backend correspondente está disponível.

## Regra de segurança

Segredos permanecem no ambiente/secret resolver. A UI nunca deve afirmar que
um provider, job ou agente está ativo sem evidência no snapshot ou evento.
