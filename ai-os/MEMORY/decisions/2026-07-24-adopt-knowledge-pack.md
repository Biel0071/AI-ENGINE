---
type: decision
title: Adotar Knowledge Pack ai-os/ como fonte de verdade viva
date: 2026-07-24
author: agente (Claude Opus)
tenant: biel0071-software-house
project: ai-engine
evidence:
  - repo: AI-ENGINE
    commit: 785cae5e
    location: platform/docs/ARCHITECTURE.md
  - repo: AI-ENGINE
    commit: 785cae5e
    location: platform/src/services/control-plane-v2.js:128
confidence: 0.95
supersedes: null
---

## Contexto
O objetivo do projeto é ser um Sistema Operacional de Engenharia de Software (AI-native IDP),
não um CRM. O usuário pediu para não depender de um único super-prompt gigante e sim de uma
base de conhecimento persistente que a IA consulta a cada tarefa.

## Conteúdo
Criado o Knowledge Pack em `ai-os/` (MASTER, CONTEXT, ARCHITECTURE, ROADMAP, CODING_STANDARDS,
TECH_STACK, CAPABILITIES, REPOSITORIES, MEMORY, PROMPTS, WORKSPACE) como fonte de verdade viva.
Prompts passam a dizer *o que fazer*; o *como* mora nos docs. Decisão de unificar no repositório
existente e construir por cima (sem mexer nas deleções não-commitadas do working tree).

Escolhas de mercado registradas em TECH_STACK: Backstage (modelo de catálogo/scaffolder),
LiteLLM (AI Gateway), Temporal/BullMQ (orquestração durável), Qdrant (vetores), Postgres+RLS.

## Impacto
Todo agente lê `ai-os/` na ordem definida antes de qualquer tarefa. Reduz retrabalho e tokens,
mantém consistência entre sessões e projetos. O control plane v2 em `platform/` é a base a evoluir.
