# GRG SERVICES OS — TECH STACK

> Stack Enterprise aceita e o porquê de cada escolha. Não introduzir tecnologia fora daqui
> sem registrar decisão em `MEMORY/decisions/`.

## Princípio de escolha

Preferir **peças de mercado maduras e open-source** a reinventar. Cada linha abaixo poupa
meses de trabalho e já resolve casos de borda que levaríamos muito para descobrir.

## Núcleo

| Camada | Escolha | Por quê |
|---|---|---|
| Runtime | **Node.js 20+** (LTS) | já é a base do control plane e dos repos do portfólio |
| Linguagem | **TypeScript** (novo código) | tipos = contratos; domínio DDD fica seguro |
| HTTP | **Fastify** (novo) / http nativo (atual) | rápido, schema-first; AI-LLM já usa Fastify |
| Banco relacional | **PostgreSQL 15+** com **Row Level Security** | multi-tenant seguro por design |
| ORM/migrations | **Prisma** | migrations versionadas; AI-LLM já usa |
| Cache / fila leve | **Redis** | cache semântico, rate limit, sessões |
| Fila / workers | **BullMQ** (curto) / **Temporal** (fluxos longos duráveis) | retry, idempotência, visibilidade |
| Vetores | **Qdrant** | embeddings, busca semântica, RAG |
| Grafo | Postgres (tabelas de arestas) → **Neo4j** se escala exigir | começa simples, evolui |
| Object storage | **S3-compatível** (MinIO local / S3 prod) | artefatos, snapshots |
| Secrets | **Secrets Manager** por tenant (Vault / cloud KMS) | credenciais fora do banco principal |

## IA

| Item | Escolha | Por quê |
|---|---|---|
| AI Gateway | **LiteLLM** (padrão) ou gateway próprio compatível | 1 API p/ OpenAI, Anthropic, Gemini, Groq, Ollama, OpenRouter, DeepSeek, Mistral, Cloudflare Workers AI |
| Modelos padrão | **Claude (Opus/Sonnet)** para engenharia; escolha por tarefa+budget | melhor custo/qualidade em código |
| Embeddings | modelo de embedding via gateway | cache obrigatório |
| RAG | Qdrant + seleção hierárquica de contexto | economia de tokens |
| Parsing de código | **tree-sitter** (web-tree-sitter já no repo) | AST multi-linguagem p/ grafo |

## Análise de código / catálogo

| Item | Escolha | Por quê |
|---|---|---|
| Modelo mental de catálogo | **Backstage** (Catalog + Templates + TechDocs) | referência de IDP; adotar o modelo, não necessariamente o produto |
| Busca cross-repo | índice próprio + embeddings (Sourcegraph como referência) | inteligência de código |
| Monorepo tooling | **Nx** ou **Turborepo** (se unificar) | build incremental, cache |

## Observabilidade

**OpenTelemetry** (traces/metrics/logs) → **Prometheus** + **Grafana** + **Jaeger**.
Logs estruturados (JSON). Health checks + status page. Toda AICall registra custo e tokens.

## Deploy / Infra

**Docker** + **Docker Compose** (local) → **Kubernetes** + **Helm** (prod).
CI/CD via **GitHub Actions**. Estratégias: blue-green, canary, rollback, zero-downtime.
Adaptadores por destino de deploy (estático, Node/API, container, DB, mobile).

## Segurança

RBAC + ABAC · MFA · OAuth/OIDC · JWT · rate limit · WAF · criptografia · audit log · LGPD.

## Frontend (Mirror UI / Admin)

| Item | Escolha | Por quê |
|---|---|---|
| Framework | **React + TypeScript + Vite** | já dominado no portfólio (ZAPAI, formalize) |
| Estado | **Zustand** / TanStack Query | leve; ZAPAI já usa Zustand |
| UI | design system próprio + Tailwind | consistência entre projetos |
| Grafo visual | biblioteca de grafo (ex. Cytoscape/D3) | visualizar knowledge graph |

## O que NÃO fazer

- Não guardar chave de provedor de IA no navegador (mover para backend/gateway).
- Não criar um segundo store de segredos ad-hoc.
- Não duplicar árvore de repositório para "reutilizar" — usar Capability versionada.
- Não trocar de tecnologia-núcleo sem registrar decisão com evidência.

## Empacotamento (App Factory)

| Alvo | Escolha | Nota |
|---|---|---|
| Mobile | **React Native / Expo** (padrão) ou Flutter | reusa UI/capabilities; build APK/AAB/IPA |
| Desktop | **Tauri** (preferido, leve) ou Electron | mesma base web |
| PWA | manifest + service worker | instalável, offline básico |
| Extensões | **Manifest V3** (Chrome/Edge/Firefox) | backend seguro, sem chave no cliente |
| Assinatura | credenciais no Secrets Manager por tenant | nunca em repo/navegador |

## Integrações (adapters plugáveis)

Cada categoria é um **port** com adapters. Suportar novo provedor = novo adapter.

| Categoria | Exemplos de adapter |
|---|---|
| Git host | GitHub (App), GitLab, Bitbucket, local |
| Cloud/Infra | Docker/Compose/K8s, Cloudflare, AWS, Azure, GCP, Oracle, DigitalOcean, Hetzner, VPS, NGINX/Traefik |
| Bancos | Postgres, MySQL/MariaDB, SQLite, MongoDB, Redis, Supabase, Firebase, ElasticSearch, Qdrant, Neo4j |
| IA | OpenAI, Anthropic, Gemini, Groq, OpenRouter, Ollama, Mistral, DeepSeek, Qwen, Llama, CF Workers AI |
| Comunicação | WhatsApp, Telegram, Instagram, Facebook/Messenger, Discord, Slack, email, SMS, push/web push |
| Pagamentos | Stripe, Mercado Pago, PIX, PayPal, Asaas, Pagar.me, PagSeguro |
| Analytics | GA, Meta Pixel, Clarity, PostHog, Mixpanel, Grafana, Prometheus, OTel |

Prioridade de implementação dos adapters segue a demanda dos projetos do portfólio (WhatsApp,
PIX/Mercado Pago, Supabase, OpenAI/Anthropic primeiro).

## Migração pragmática

O control plane atual usa `json-store` (MVP). A troca para Postgres+RLS é **um adapter novo**
implementando o mesmo port — o domínio não muda. Mesma lógica para Qdrant e Redis.
