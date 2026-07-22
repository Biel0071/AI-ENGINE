# Arquitetura da Software House

## Princípio central

Os projetos continuam como repositórios independentes. O AI-ENGINE armazena metadados, snapshots, grafos, artefatos e execuções; ele não transforma os dez projetos em subpastas permanentemente acopladas.

## Camadas

1. **Control plane**: tenants, usuários, projetos, integrações, políticas e custos.
2. **Connectors**: GitHub App, agente local/MCP, importadores Lovable e provedores de publicação.
3. **Workers**: clone efêmero, scan, testes, build, análise, geração e deploy.
4. **Knowledge plane**: snapshots, embeddings, grafo, decisões, prompts e padrões reutilizáveis.
5. **Mirror UI**: portfólio, saúde, arquitetura, relações, runs e ambientes publicados.

## Fluxo de sincronização

```text
GitHub webhook -> repository event -> sync job -> checkout efêmero
-> AI-ENGINE scanner -> snapshot imutável -> grafo/embeddings
-> métricas e sugestões -> dashboard
```

O checkout deve ser temporário e isolado por `tenantId/projectId/runId`. Somente metadados e artefatos aprovados permanecem no control plane.

## Fluxo de criação e reutilização

```text
brief -> busca de capacidades existentes -> plano -> seleção de componentes
-> novo repositório -> geração incremental -> testes -> preview -> aprovação -> produção
```

Copiar uma funcionalidade significa selecionar uma `Capability` versionada com origem, licença, dependências, testes e adaptações. Não significa copiar pastas sem rastreabilidade.

## Publicação

O contrato de deploy será único, com adaptadores para provedores diferentes:

- projetos estáticos e SPAs;
- Node.js/API;
- containers;
- bancos e migrations;
- preview por branch e produção com aprovação.

Cada deployment guarda revisão Git, provedor, ambiente, logs, URL e possibilidade de rollback.

## Segurança multitenant

- `tenant_id` obrigatório em todas as entidades;
- PostgreSQL Row Level Security;
- credenciais fora do banco principal, criptografadas por tenant;
- workers sem acesso global aos repositórios;
- nenhuma alteração automática sem política e trilha de auditoria;
- repositórios privados nunca incorporados ao artefato público do AI-ENGINE.

## Próximos incrementos

1. GitHub App com instalação na conta `Biel0071`.
2. Worker de sincronização e análise do AI-ENGINE existente.
3. PostgreSQL e fila persistente.
4. snapshots e grafo por commit.
5. adaptadores de preview/produção.
6. catálogo de capacidades reutilizáveis.
7. integração MCP com Codex, Claude Code, VS Code e outros agentes.
