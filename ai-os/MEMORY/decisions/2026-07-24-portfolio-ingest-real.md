---
type: decision
title: Ingestão de portfólio inteiro via GitHub API real + chat ("acoplar todos os projetos")
date: 2026-07-24
author: agente (Claude Opus)
tenant: biel0071-software-house
project: ai-engine
evidence:
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/src/repo-intel/github-connector.js
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/src/repo-intel/portfolio.js
confidence: 0.92
supersedes: null
---

## Contexto
Usuário no chat pediu "acoplar todos os projetos do meu user github biel0071 e mapear" e o
agente respondeu lista vazia — faltava a funcionalidade de listar/acoplar um portfólio inteiro.

## Conteúdo
Criados:
- **GitHubConnector** (`grg/src/repo-intel/github-connector.js`): API real do GitHub via https
  nativo. listUserRepos(username). Sem token = públicos; com GITHUB_TOKEN = privados + rate maior.
- **PortfolioService** (`grg/src/repo-intel/portfolio.js`): ingestUser() lista todos, registra
  cada repo, pula vazios/grandes, clona+analisa os demais. onProgress opcional.
- ChatAgent: nova intent `ingest_portfolio` + extractUsername() robusto (pula stopwords como
  "github"/"user"; lida com "meu user github biel0071", "biel0071/", URL).
- Front: chip "acoplar TODO meu portfólio".

## Validação REAL (servidor no ar, API + clones reais)
"acoplar todos os projetos do meu user github Biel0071" → listou 5 repos públicos via API real,
clonou e analisou os 5:
- ZAPAI-FINAL: 1762 arq, 9 caps
- fortlev-quote-master: 601 arq, 8 caps
- AI-LLM: 125 arq, 6 caps
- GERADOR-FICHA: 3 arq, 0 caps ; SC-V1: 1 arq, 0 caps (placeholders)
Loop evolutivo aprendeu sozinho: whatsapp-crm/ai-gateway/auth-rbac/analytics/ecommerce/dashboard
em 3 repos (candidatas a núcleo), payments-pix/stripe em 2. 9 insights, 16 eventos de memória.
12 arquivos de teste verdes (portfolio.test.js incluído).

## Nota
Repos privados (formalize-magic, swift-wa-assist, ZAPAI-CRM) exigem GITHUB_TOKEN — sem ele a API
só devolve os 5 públicos. Setar env GITHUB_TOKEN habilita o portfólio completo.
Clones efêmeros removidos; metadados/análises persistem em grg/.data/state.json.
