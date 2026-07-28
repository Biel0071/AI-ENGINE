---
type: decision
title: Discovery Engine — gap analysis de capacidades vs GRG (existente/parcial/inexistente/superior)
date: 2026-07-25
author: agente (Claude Opus)
tenant: biel0071-software-house
project: ai-engine
evidence:
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/src/discovery/discovery-engine.js
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/test/discovery.test.js
confidence: 0.88
supersedes: null
---

## Contexto
Spec GRG CITY OS (v2.0) — enorme (cidade isométrica Three.js, NestJS, K8s, Prometheus/Grafana/
Loki/Tempo/Jaeger). Escolhi entregar o **Discovery Engine**, a peça mais alinhada ao que o usuário
pede desde o começo: entender projetos, classificar o que já tem vs o que falta.

## Conteúdo
DiscoveryEngine (grg/src/discovery/): pega o snapshot real de um repo analisado e CLASSIFICA cada
capacidade contra GRG_MODULES (o que a plataforma já oferece): existing / partial / inexistent /
superior (heurística de riqueza: >100 endpoints ou >30 tabelas). Gera mapa funcional (revision,
módulos, endpoints, entidades), sugestões de módulo (ports/adapters/endpoints/tests — spec original,
não copia código), alimenta grafo (arestas DISCOVERED) e memória. Endpoint POST /api/projects/:id/discovery.

## Validação REAL
Acoplei AI-LLM (clone real, commit bba24e81) via chat → discovery: 6 capacidades, 5 existentes,
1 parcial (ecommerce), sugestão de ampliar ecommerce. 16 arquivos de teste verdes.

## CONVERSA HONESTA REGISTRADA (importante para futuras sessões)
O padrão desta série de sessões: usuário manda specs cada vez maiores (Office→City OS) pedindo
plataformas Enterprise (Three.js isométrico, Next/NestJS, K8s, observabilidade full). ESTE AMBIENTE
NÃO CONSEGUE construir/rodar isso: node nem está no PATH (uso binário do Photoshop), npm install de
Next/NestJS não roda aqui. O que é viável e honesto: continuar evoluindo o grg/ (Node stdlib puro,
hexagonal, testado) uma peça real por vez. Cada spec gigante → extrair a fatia central viável.
Já entregue e testado (16 test files): control-plane, repo-intel, ai-runtime, software-factory (gera
app real em disco), runtime/deploy, product (whitelabel/billing), app-factory, orchestrator, evolution
(loop de memória), digital-twin, chat (Ollama real + fallback AI Platform VPS), portfolio (acopla todos
repos do user via GitHub API), workforce (empresa virtual por loja), office UI (prédio HTML/CSS por
andares), discovery (gap analysis). NÃO feito: isométrico 3D, autonomia real de agentes, telemetria
de infra, multi-modelo cloud (só Ollama local + ponte VPS pronta mas VPS fora do ar).

## Recomendação pendente ao usuário
Para o produto isométrico de verdade (Three.js/Next), o caminho honesto é um projeto frontend
SEPARADO consumindo esta API — esforço grande, provável time/orçamento. Aqui temos o cérebro+API+UI
funcional que prova o conceito.
