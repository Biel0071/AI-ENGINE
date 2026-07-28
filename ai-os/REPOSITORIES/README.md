# REPOSITORIES — Registro / Espelho Inteligente

Cada repositório conectado tem uma pasta aqui com **metadados, não código**. O AI ENGINE
espelha inteligência (arquitetura, grafo, capabilities detectadas), nunca copia a árvore.

## Fonte canônica atual

A fotografia estruturada dos 10 repositórios Biel0071 (22/07/2026) vive em:
- `platform/data/repository-analysis-2026-07-22.json` (dados)
- `platform/docs/REPOSITORY-PORTFOLIO-ANALYSIS-2026-07-22.md` (leitura humana)

Cada pasta abaixo resume/aponta para essa fonte e será atualizada por commit quando o
worker de sync (Fase 2) entrar em ação.

## Estrutura por repositório

```
REPOSITORIES/
  <repo>/
    metadata.yaml       identidade, stack, commit, scores (schema abaixo)
    architecture.md     (gerado) arquitetura observada
    graph.json          (gerado) knowledge graph do repo
    components.json     (gerado) componentes/telas/hooks
    apis.json           (gerado) endpoints e contratos
    database.json       (gerado) tabelas/migrations
    capabilities.json   (gerado) capabilities detectadas
```

## Schema `metadata.yaml`

```yaml
id: zapai-final
name: ZAPAI-FINAL
owner: Biel0071
provider: github
url: https://github.com/Biel0071/ZAPAI-FINAL
visibility: private
branch: main
revision: "77788193cca780c56d61f05766292a1124c0ff50"
primary_language: TypeScript
stack: [node, express, socket.io, baileys, postgres, react, vite, zustand, openai]
family: whatsapp-crm-core        # família de consolidação, se houver
role: canonical                  # canonical | variant | legacy | prototype | placeholder
status: active
capabilities: [whatsapp-crm, ai-gateway, analytics, rbac]
scores:                          # 0..100, preenchidos pela análise
  quality: null
  security: null
  architecture: null
  ai: null
  risk: null
duplication:                     # oportunidades de reutilização/consolidação
  - with: swift-wa-assist
    identical_files: 1539
    action: consolidar em módulos + feature flags do núcleo
last_commit: "77788193"
snapshot_date: 2026-07-22
notes: >
  Base mais madura da família CRM WhatsApp. Atenção: atualizar grafo para o HEAD,
  consolidar camadas legadas, manter Baileys atrás de adapter substituível.
```

## Papéis (role)

- `canonical` — núcleo da família (fonte de verdade da capability)
- `variant` — derivado por configuração/tenant do canônico
- `legacy` — versão anterior, fonte de requisitos a comparar
- `prototype` — protótipo a reconstruir com padrões Enterprise
- `placeholder` — só README/vazio, backlog

## Os 10 repositórios (resumo)

| Repo | Papel | Família | Capabilities principais |
|---|---|---|---|
| AI-ENGINE | platform | — | control-plane, memory, knowledge-graph |
| AI-LLM | canonical | ai-gateway | ai-gateway (multi-provedor, filas, cache) |
| formalize-magic | canonical | commerce-core | commerce, catálogo, checkout, pagamentos, IA |
| fortlev-quote-master | variant | commerce-core | catálogo, orçamento, checkout, admin |
| ZAPAI-FINAL | canonical | whatsapp-crm-core | whatsapp-crm completo |
| swift-wa-assist | variant | whatsapp-crm-core | whatsapp-crm operacional multi-nó |
| ZAPAI-CRM | legacy | whatsapp-crm-core | chat, conexões, campanhas, automação |
| Insta-auto-post | prototype | — | scraping + geração de legenda (a reconstruir) |
| GERADOR-FICHA | placeholder | — | só README |
| SC-V1 | placeholder | — | vazio |

Detalhe completo por repo em `platform/data/repository-analysis-2026-07-22.json`.
