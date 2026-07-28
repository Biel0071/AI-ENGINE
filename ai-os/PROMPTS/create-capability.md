# PROMPT — Extrair Capability

> Cole `_HEADER.md` antes. Preencha [FUNCIONALIDADE] e [ORIGEM].

## Tarefa

Extraia a funcionalidade **[FUNCIONALIDADE]** (origem: **[ORIGEM]** = repo/commit/caminho)
para o catálogo reutilizável, sem copiar árvore cega.

## Execução

1. Confirmar que ainda não existe capability equivalente em `ai-os/CAPABILITIES/`.
2. Mapear com evidência: rotas, APIs, componentes, telas, workers, banco, permissões, deps.
3. Criar `ai-os/CAPABILITIES/[id]/capability.yaml` (schema no README) + `README.md`.
4. Identificar **adapters** (pontos substituíveis) e **dependências** (outras capabilities).
5. Registrar `sources` com evidência (repo/commit) e, se houver, `consolidation.family`.
6. Se houver duplicação entre repos, registrar a oportunidade de consolidação.
7. Registrar decisão em `ai-os/MEMORY/patterns/` ou `decisions/`.

## Saída esperada

Capability catalogada com metadados completos, adapters e evidência; memória atualizada.
