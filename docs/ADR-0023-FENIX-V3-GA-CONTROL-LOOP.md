# ADR-0023 — FÊNIX V3 GA Control Loop

## Decisão

O primeiro corte da V3 conecta a infraestrutura existente em dois controles permanentes: o Health Orchestrator e o Mission Planner. Não cria outro Runtime, Event Bus, AI Gateway ou sistema de agentes.

O Health Orchestrator usa as sondas operacionais reais, mantém histórico, calcula disponibilidade, p95 de latência, direção da latência, falhas consecutivas e risco previsto. Mission Kernel, Event Store e recursos do processo passam a ser componentes observáveis.

O Mission Planner transforma objetivos em DAGs de um catálogo fechado. Ele estima duração, tokens, custo e risco, registra apenas eventos estruturados e materializa a missão através do Mission Kernel. Entradas incompletas geram perguntas explícitas; não geram uma missão inválida.

## Gate de GA

O relatório de estabilidade falha fechado. `GO_LIVE_CANDIDATE` exige:

- readiness operacional `READY`;
- ausência de risco crítico previsto;
- evidências válidas de backup, restore, rollback, logs centralizados, build, smoke test e validação externa.

`GO_LIVE_CANDIDATE` não equivale a deploy realizado. Release, tag, build, deploy e smoke test em ambiente limpo continuam sendo provas externas e não podem ser inferidos do código.

## Limites deste corte

- Planejamento determinístico; decomposição generativa via AI Gateway fica para um corte posterior.
- Sem STT/TTS, vídeo ou streaming visual.
- Sem declaração GA e sem deploy automático.
- O aprendizado continua governado por observação, hipótese, validação e promoção.
