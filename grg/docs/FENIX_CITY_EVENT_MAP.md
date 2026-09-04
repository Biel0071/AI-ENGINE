# FÊNIX AI City — mapa de eventos

| Evento/estado real | Efeito visual permitido |
|---|---|
| `agent.created` / agente no snapshot | inserir entidade real na estação derivada do departamento |
| `agent.status.changed` | atualizar badge, cor e atividade do agente |
| `job.started` / `runtime.job.running` | marcar estação de execução e permitir movimento para destino real |
| `job.completed` | marcar conclusão e registrar no stream |
| `job.failed` | estado `ERROR`/`BLOCKED` e foco de alerta |
| `agent.handoff` | desenhar transferência somente com origem, destino e mensagem do evento |
| `memory.read` / `memory.write` | destacar Memory Archive somente durante o evento |
| `human.required` | destacar Approval e bloquear ação até decisão real |
| desconexão/reconexão | HUD `RECONNECTING` → `SYNCING` → `LIVE` |

Não existe evento sintético para manter a cidade “viva”.
