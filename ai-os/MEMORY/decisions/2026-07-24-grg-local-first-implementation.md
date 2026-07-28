---
type: decision
title: Implementação local-first executável do GRG Services OS em grg/
date: 2026-07-24
author: agente (Claude Opus)
tenant: biel0071-software-house
project: ai-engine
evidence:
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/src/app.js
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/test/orchestrator.test.js
confidence: 0.9
supersedes: null
---

## Contexto
Pedido: "faça todas as fases até acabar". Node não está no PATH; encontrado runtime utilizável
em `C:/Program Files/Adobe/Adobe Photoshop 2023/node.exe` (v18.13.0), usado para rodar testes.

## Conteúdo
Implementados os 7 planos do GRG Services OS em `grg/`, Node stdlib puro, arquitetura hexagonal,
multi-tenant, event-driven, com testes por fase (8 arquivos de teste, ~35 casos, todos verdes):
1. Kernel + Control Plane (RBAC/ABAC, tenant/org/cliente)
2. Repository Intelligence (connect/scan/snapshot por commit/grafo/memória, delta-aware)
3. AI Runtime (gateway multi-provedor, cache semântico, token budget, telemetria de custo)
4. Software Factory (plan→descobrir reuso→gerar só o delta→validar)
5. Universal Runtime (deploy preview/staging/prod com aprovação, rollback)
6. Produto GRG (White Label + PlanGate, Design tokens, Marketplace install, Billing)
7. App Factory (pwa/electron/tauri/android/ios/extensões) + Orchestrator (meta-agente e2e) +
   Painel Master (HTTP API + dashboard)

Servidor validado via curl (health, orquestração e2e gerando 2 artefatos, overview) e e2e HTTP
automatizado. Preview in-app do painel não disponível neste install (attach desabilitado).

## Padrão: ports & adapters
Domínio testado é real; integrações externas são adapters locais/mock trocáveis sem tocar no
domínio: store (Memory/File → Postgres+RLS), git host (Local → GitHub App), AI (Echo → LiteLLM/
OpenAI/Anthropic), deploy (Mock → Cloudflare/AWS/K8s), packager (Mock → gradle/xcode/tauri).

## Impacto
A plataforma roda ponta-a-ponta localmente. Próximos incrementos = substituir cada adapter mock
pelo real (credencial/ferramenta), sem reescrever domínio. Bug corrigido durante a fase: `start()`
do server precisava aguardar o evento `listening` antes de retornar (server.address() era null).

## Nota de ambiente
Testes rodam com: `"/c/Program Files/Adobe/Adobe Photoshop 2023/node.exe" --test test/` dentro de `grg/`.
