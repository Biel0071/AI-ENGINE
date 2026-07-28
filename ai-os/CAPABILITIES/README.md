# CAPABILITIES — Catálogo de Funcionalidades Reutilizáveis

Biblioteca viva. Cada capability é uma funcionalidade versionada que pode ser **selecionada**
(não copiada cega) ao criar/evoluir um sistema. Reutilizar = escolher uma versão com origem,
licença, dependências, testes e adaptações.

## Estrutura de uma capability

```
CAPABILITIES/
  <nome>/
    capability.yaml    metadados (schema abaixo) — OBRIGATÓRIO
    README.md          o que é, quando usar, como acoplar
    components/        (opcional) componentes de UI reutilizáveis
    api/               (opcional) contratos de API / rotas
    database/          (opcional) schema / migrations
    tests/             (opcional) testes que provam a capability
```

## Schema `capability.yaml`

```yaml
id: whatsapp-crm                 # kebab-case, único
name: WhatsApp CRM
description: Inbox, contatos, sessões, campanhas e automações para WhatsApp
category: communication          # ver categorias abaixo
version: 1.0.0                   # semver
status: stable                   # draft | beta | stable | deprecated
when_to_use: >
  Quando o produto precisa atender clientes via WhatsApp com inbox multi-agente,
  contatos/leads, campanhas e automações.
stack: [node, express, socket.io, baileys, postgres, react, typescript]
dependencies:                    # outras capabilities exigidas
  - ai-gateway
  - rbac
provides:                        # o que entrega
  routes: [/inbox, /contacts, /campaigns]
  apis: [POST /messages, GET /conversations]
  screens: [Inbox, Contacts, Campaigns]
  workers: [session-manager, message-orchestrator]
  database: [contacts, conversations, messages, sessions]
permissions: [inbox:read, inbox:write, campaign:manage]
sources:                         # de onde foi minerada (evidência)
  - repo: ZAPAI-FINAL
    commit: 77788193
    note: núcleo canônico da família
  - repo: swift-wa-assist
    commit: 64152c6b
    note: visão operacional multi-nó
compatibility: [multi-tenant, feature-flag]
metrics:
  avg_tokens: null               # preenchido ao usar via AI Gateway
  performance: null
  test_coverage: null
adapters:                        # pontos substituíveis
  - baileys (atrás de adapter de mensageria substituível)
```

## Categorias

`communication` · `commerce` · `crm` · `analytics` · `ai` · `auth` · `payments` ·
`content` · `automation` · `infra` · `ui` · `data` · `mobile` · `platform`

## Regras

- Toda funcionalidade reutilizável criada/descoberta **vira** uma capability aqui.
- Evoluiu? Bump de versão + nota de mudança. Nunca quebrar quem já usa sem deprecar.
- Detectou duplicação entre repos? Registrar oportunidade de consolidação (ver famílias).
- Toda capability aponta suas `sources` com evidência (repo/commit).

## Famílias canônicas (da análise do portfólio)

- **whatsapp-crm-core** ← ZAPAI-FINAL (núcleo) + swift-wa-assist (operacional multi-nó)
- **commerce-core** ← formalize-magic (edição ampla) + fortlev-quote-master (variante cliente)
- **ai-gateway** ← AI-LLM (gateway multi-provedor)
