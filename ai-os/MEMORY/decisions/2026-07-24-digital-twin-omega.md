---
type: decision
title: Digital Twin — modelo vivo por sistema (GRG Services OMEGA)
date: 2026-07-24
author: agente (Claude Opus)
tenant: biel0071-software-house
project: ai-engine
evidence:
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/src/digital-twin/digital-twin.js
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/test/digital-twin.test.js
confidence: 0.9
supersedes: null
---

## Contexto
Spec OMEGA exige um Digital Twin por sistema conectado: modelo vivo que a IA consulta ANTES de
sugerir qualquer mudança (arquitetura, APIs, banco, deploy, saúde, riscos, insights).

## Conteúdo
Criado `DigitalTwinService` (`grg/src/digital-twin/digital-twin.js`). Ele COMPÕE (não duplica) o
que os outros planos já produziram — snapshot de arquitetura, grafo, capabilities, memória,
deploys, insights do EvolutionEngine — num objeto único, versionado (histórico append-only, um
`current` por sujeito). Auto-refresh em `scan.completed` (LIGADO por padrão; option digitalTwin:false).

Modelo inclui: subject, architecture, apis, components, database, capabilities, dependencies,
deployments, memory, insights, health (score + dimensão mais fraca), risks, e `pending` (campos
previstos pela spec ainda sem adapter real: metrics/performance/seo/analytics/costs/incidents).

Método `advise()`: a consulta que a IA faz antes de mudar — devolve saúde + guidance acionável
(consolidação, reutilizar em vez de recriar, riscos, validar em preview).

Endpoints: GET /api/twins, /api/twins/:id, /api/twins/:id/advise.

## Validação com repo real
Twin do ZAPAI-FINAL construído a partir de clone real: 1762 arquivos, 385 APIs, 95 componentes,
50 tabelas, 9 capabilities, health 78 (mais fraco: quality), 2 riscos detectados (repo público
com auth; muitas dependências). advise() retornou guidance correto. 10 arquivos de teste verdes.

## Impacto
A spec pede "a IA consulta o twin antes de mudar" — agora existe o objeto e o método advise().
Próximo: alimentar os campos `pending` com adapters reais (Website Intelligence p/ SEO/performance,
analytics connectors p/ métricas/custos, incidents do deploy). Twin já é a espinha p/ execução
assistida ("melhore a conversão da Loja A" consultaria o twin da loja).

## Escopo honesto
Entregue: Digital Twin real, versionado, auto-atualizado, com health/risks/advise, testado.
NÃO entregue (roadmap): Website Intelligence por URL, MCP Hub, gateway multi-modelo real, CRM,
analytics connectors, agentes autônomos. O twin é a fundação que amarra esses módulos futuros.
