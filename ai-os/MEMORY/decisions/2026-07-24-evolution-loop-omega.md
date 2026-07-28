---
type: decision
title: Ligar loop de memória evolutiva contínua (GRG Services OMEGA)
date: 2026-07-24
author: agente (Claude Opus)
tenant: biel0071-software-house
project: ai-engine
evidence:
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/src/evolution/evolution-engine.js
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/test/evolution.test.js
confidence: 0.9
supersedes: null
---

## Contexto
Pedido (spec OMEGA): habilitar de agora em diante um grafo + loop de memória para análise
evolutiva contínua — aprendizado real do próprio sistema e dos acoplamentos.

## Conteúdo
Criado o **EvolutionEngine** (`grg/src/evolution/evolution-engine.js`), LIGADO por padrão em
`createApp` (option `evolution:false` desliga). Ele escuta o event bus (repo.connected,
scan.completed, project.generated, deployment.completed, marketplace.installed,
whitelabel.provisioned, app.built) e, a cada sinal real, deriva insights de ordem superior e
grava de volta em memória append-only + knowledge graph. Insights idempotentes (dedup por chave).

Tipos de insight derivados hoje:
- capability-reuse: capability declarada por >=2 repos => candidata a núcleo reutilizável
- family-consolidation: repos na mesma família => consolidar em módulos + feature flags
- catalog-coverage: mede cobertura (capabilities/análises/repos)
- reuse-rate: % de projetos gerados que reutilizaram capabilities

Endpoints novos no Painel Master: GET /api/insights, GET /api/evolution.
Histórico de ciclos em state.learningCycles (snapshot da inteligência a cada tick).

## Validação com dados reais
Acoplados ZAPAI-FINAL (1762 arq) e swift-wa-assist (1671 arq), clones reais do GitHub. O loop
aprendeu sozinho: 9 capabilities compartilhadas entre os dois + consolidação da família
whatsapp-crm-core, gerando 11 eventos de memória com evidência. 9 arquivos de teste verdes.

Bug corrigido: insight idempotente não atualizava summary/confidence ao reprocessar (catalog-coverage
mostrava "1 repo" com 2 conectados). Agraga estado atual em cada tick agora.

## Impacto
Cada novo acoplamento/geração/deploy agora aumenta permanentemente a inteligência: mais insights,
grafo mais rico, memória mais forte — exatamente o "crescimento contínuo" da spec OMEGA.

## Nota de escopo (honestidade)
Isto entrega o CICLO evolutivo real (ingest→analisa→aprende→memoriza) com adapters locais. A spec
OMEGA completa (Digital Twin por sistema, voz, agentes autônomos, analytics de loja/SEO/conversão)
é roadmap além disto. O que está ligado e testado é o loop de aprendizado + grafo + memória.
