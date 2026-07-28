# PROMPT — Atualização Coordenada de Múltiplos Repositórios

> Cole `_HEADER.md` antes. Preencha [MUDANÇA] e [REPOS].

## Tarefa

Aplique **[MUDANÇA]** de forma coordenada nos repositórios **[REPOS]** (ou "todos da família X").

## Execução (fan-out durável)

1. Descobrir alvos: quais repos possuem a capability/módulo afetado (via `REPOSITORIES/` + grafo).
2. Para cada repo, em paralelo:
   - clone efêmero isolado → branch nova (nunca em `main`)
   - aplicar a mudança reutilizando a capability versionada
   - rodar testes do repo
   - abrir PR com título curto + descrição estruturada
3. Consolidar: relatório por repo (sucesso/falha, testes, link do PR).
4. Registrar decisão + impacto em `ai-os/MEMORY/decisions/` com evidência.
5. Atualizar versão da capability afetada se o contrato mudou (semver + deprecação se quebrar).

## Regras

- Idempotente e com retry (padrão de orquestração durável).
- Não commitar/mergear sem aprovação. Nunca force-push.
- Diferenças específicas de cliente viram config/feature-flag, não fork da árvore.

## Saída esperada

PRs abertos por repo, testes por repo, relatório consolidado, memória e capability atualizadas.
