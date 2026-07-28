# PROMPT — Analisar / Conectar Repositório

> Cole `_HEADER.md` antes. Preencha [REPO].

## Tarefa

Conecte e analise o repositório **[REPO]** (URL ou caminho), alimentando o registry, o
knowledge graph e a memória evolutiva. **Não copie a árvore** — espelhe inteligência.

## Execução obrigatória

1. Clonar de forma **efêmera e isolada** (temporário; não persistir a árvore).
2. Identificar: stack, framework, dependências, banco, APIs/endpoints, componentes, telas,
   hooks, services, workers, cron, filas, integrações.
3. Gerar/atualizar em `ai-os/REPOSITORIES/[repo]/`:
   - `metadata.yaml` (ver schema no README do diretório)
   - `architecture.md`, `graph.json`, `components.json`, `apis.json`, `database.json`,
     `capabilities.json`
4. Atualizar o **knowledge graph** (módulos→arquivos→funções→APIs→deps).
5. Calcular **scores** (qualidade, segurança, arquitetura, IA, risco) 0–100.
6. Detectar **duplicações** e **capabilities** reutilizáveis; registrar oportunidades de
   consolidação (família canônica quando aplicável).
7. Registrar `MemoryEvent` com evidência (repo/commit/arquivo). Sem evidência → não registrar.
8. Análise **incremental por delta**: se já analisado, reprocessar só o que o commit mudou.

## Regras

- Segredos: contar, nunca incorporar à memória. Repo privado nunca vira artefato público.
- Resultado por commit é imutável e auditável.

## Saída esperada

Registry atualizado, grafo atualizado, capabilities detectadas catalogadas, scores e
oportunidades de consolidação, memória com evidência.
