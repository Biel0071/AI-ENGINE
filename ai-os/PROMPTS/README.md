# PROMPTS — Biblioteca de Prompts

Você **nunca conversa direto** improvisando. Usa um prompt pronto que já obriga o agente a ler
o Knowledge Pack e seguir o ciclo de trabalho. Prompts dizem *o que fazer*; o *como* está em
`MASTER.md` + `CONTEXT.md` + `ARCHITECTURE.md`.

## Como usar

1. Abra o Claude Code no repositório.
2. Cole o conteúdo de `_HEADER.md` (obrigatório) + o prompt da tarefa desejada.
3. O agente lê o Knowledge Pack, analisa, planeja, mostra o plano, executa, testa, memoriza.

## Prompts disponíveis

- `_HEADER.md` — cabeçalho obrigatório colado antes de qualquer prompt (ordem de leitura)
- `MASTER-BUILD-PROMPT.md` — a especificação-mãe (usar ao evoluir a própria plataforma)
- `create-project.md` — criar sistema novo por prompt reutilizando capabilities
- `analyze-repository.md` — conectar/analisar um repositório e alimentar grafo+memória
- `create-capability.md` — extrair funcionalidade reutilizável para o catálogo
- `update-multi-repo.md` — atualização coordenada de vários repositórios
- `fix-bugs.md` — corrigir bug com registro em MEMORY
- `optimize.md` — otimizar performance/custo/tokens
- `security-review.md` — revisão de segurança
- `generate-tests.md` — gerar/expandir testes

## Regra

Todo prompt termina obrigando o agente a: rodar testes, atualizar `WORKSPACE/active-task/`,
registrar `MEMORY/` e atualizar `CAPABILITIES/`/`REPOSITORIES/` quando aplicável.
