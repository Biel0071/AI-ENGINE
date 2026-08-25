# FÊNIX PROJECT MEMORY

## O QUE EXISTIA
- Múltiplas versões de frontends (React, Vanilla, Plataformas Legadas).
- Códigos espalhados por `grg/`, `platform/`, `crm/`.

## O QUE FOI CRIADO
- Um shell unificado e canônico em `grg/public/` baseado em Vanilla JS + Canvas para alta performance e estabilidade.
- Um roteador baseado em hash (`#city`, `#ide`).

## O QUE FOI REMOVIDO
- Interfaces React antigas experimentais.
- Plataformas legadas redundantes.
- Mocks e dados falsos da UI.

## O QUE FOI RESTAURADO
- O ambiente completo 24/7 na branch `fenix/stabilize-canonical-frontend`.
- O AI City com física real em `iso-city.js`.

## O QUE QUEBROU & POR QUE QUEBROU
- Incompatibilidades de estado quando múltiplos frontends tentavam se conectar ao mesmo `UnifiedEventBus`. Concorrência de Websockets.

## COMO FOI CORRIGIDO
- Centralizando tudo num único frontend `grg/public/unified-app.js` e removendo/arquivando os legados (`FENIX_CONSOLIDATION_REPORT.md`).

## QUAL VERSÃO ERA MELHOR
- A branch `fenix/stabilize-canonical-frontend` possui o estado da arte do AI City e da Integração de Agentes, sendo coroada como a versão canônica.

## QUAL DECISÃO FOI TOMADA
- **REGRA ABSOLUTA**: Há apenas um frontend canônico. Ele será mantido e evoluído de forma incremental.

## QUAL DECISÃO NÃO DEVE SER REPETIDA
- Criar novos frontends do zero, novas pastas `apps/v2`, ou utilizar novos frameworks (como React/Vite) só porque parecia mais fácil no momento.

## PRÓXIMA EVOLUÇÃO
- Teste real ponta-a-ponta de todas as views no FENIX_UI_GRAPH.
- Deploy contínuo na VPS e fechamento do ciclo FÊNIX MASTER (Supervisor) -> Agente (Executor).

## ESTADO ATUAL
- Congelado na branch `fenix/stabilize-canonical-frontend` no commit `c7e745e7`.

## ESTADO DESEJADO
- Sistema Operacional Visual, Agentic, AI City + IDE Integrada rodando de forma 100% autônoma, real e testável 24/7.
