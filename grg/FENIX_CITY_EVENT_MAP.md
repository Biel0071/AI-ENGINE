# FÊNIX AI City — mapa de eventos

O adaptador visual recebe eventos do runtime e converte somente eventos
observados em estado visual. O mapeamento canônico está em
`public/fenix-city-event-adapter.js`.

| Evento | Estado visual | Zona | Evidência esperada |
|---|---|---|---|
| `job.started`, `runtime.job.running` | WORKING | estação do agente | job RUNNING |
| `job.completed`, `runtime.job.completed` | COMPLETED | destino do job | job concluído |
| `job.failed`, `runtime.job.failed` | FAILED | estação do agente | erro persistido |
| `agent.handoff` | HANDOFF | communication | handoff real |
| `human.required`, `human.approval_required` | WAITING | approval | aprovação pendente |
| `memory.read`, `memory.write` | THINKING | memory | operação de memória |
| `tool.started`, `agent.tool.call` | TOOL_CALL | terminal/tooling | chamada de ferramenta |

Eventos desconhecidos são ignorados visualmente até existir um mapeamento
explícito. Isso evita que o canvas conte uma história não suportada pelo
runtime.
