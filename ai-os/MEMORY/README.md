# MEMORY — Memória Evolutiva

Append-only. Nunca apagar. Toda entrada tem evidência. Registro errado → cria-se novo que
o corrige e linka; o antigo permanece auditável.

## Pastas (camadas)

```
MEMORY/
  decisions/       decisões de arquitetura/produto (por quê escolhemos X)
  bugs/            bugs resolvidos (causa, correção, arquivos, commit)
  patterns/        padrões reutilizáveis descobertos
  lessons/         lições de falhas (o que não repetir)
  optimizations/   ganhos de performance/custo/token
  architecture/    mudanças estruturais relevantes
```

## Formato de um registro (`.md`)

Um arquivo por evento, nome `YYYY-MM-DD-slug.md`:

```markdown
---
type: decision            # decision | bug | pattern | lesson | optimization | architecture
title: título curto
date: 2026-07-24
author: quem              # humano ou agente
tenant: biel0071-software-house
project: ai-engine        # ou o projeto alvo
evidence:                 # OBRIGATÓRIO — sem evidência, registro é inválido
  - repo: AI-ENGINE
    commit: 785cae5e
    location: platform/src/services/control-plane-v2.js:128
confidence: 0.9           # 0..1
supersedes: null          # slug de registro anterior que este corrige, se houver
---

## Contexto
Qual era a situação.

## Conteúdo
Decisão tomada / causa do bug / padrão / lição / otimização.

## Impacto
O que muda daqui pra frente.
```

## Quando gravar

- Resolveu bug → `bugs/`
- Decidiu arquitetura → `decisions/`
- Descobriu padrão reutilizável → `patterns/`
- Algo falhou e aprendeu → `lessons/`
- Otimizou custo/perf/token → `optimizations/`

## Ligação com o resto

- Cada registro com evidência vira nó `memory` + aresta `LEARNED` no knowledge graph.
- No control plane, o equivalente em runtime é o `memoryEvent` (ver
  `platform/src/services/control-plane-v2.js`). Este diretório é a camada versionada/durável
  que acompanha o repositório; o control plane é a camada operacional/consultável por API.
