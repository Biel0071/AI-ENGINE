# ADR-0014: Cognitive Core governado

## Status

Aceito incrementalmente em 2026-07-27.

## Decisão

O Cognitive Core coordena contratos públicos e nunca executa trabalho. Observações vêm do Event
Store; contexto entra por providers read-only; hipóteses exigem evidências, riscos e plano. A
prioridade usa fatores e pesos persistidos, sem heurística oculta. Toda hipótese passa pelo Policy
Engine e Approval Engine. O único despacho possível cria um Job no Runtime.

Eventos finais do Runtime geram validação e reflexão append-only. O Core publica
`cognitive.learning.recorded`; uma projeção independente atualiza Memory e Knowledge. Version Engine
e AI City consomem os mesmos eventos automaticamente, evitando dependência direta.

Hipóteses geradas automaticamente pelo Observation Engine são planning-only: não recebem job e não
podem ser despachadas até um administrador selecionar um contrato registrado. Operações críticas
sempre exigem aprovador diferente e a aprovação é consumida uma única vez.

## Escopo entregue e limites

O fluxo Observe → Context → Hypothesis → Priority → Policy → Approval → Runtime → Validation →
Reflection → Learning está operacional. Contexto inicial expõe snapshots minimizados de Capability,
Service Registry, Runtime, Memory, Knowledge e Version Engine. Digital Twin ainda é repo-centric;
sua expansão operacional continua necessária. Avatar administrativo e scheduler noturno serão
incrementos separados e não são declarados concluídos neste ADR.

## Migração

O schema v14 adiciona goals, observations, hypotheses, decisions, validations, reflections, cycles e
cursors cognitivos. Todos os registros são tenant-scoped e históricos.
