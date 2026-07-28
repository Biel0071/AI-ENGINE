# WORKSPACE — Estado da Tarefa Ativa

Mantém o contexto entre sessões para o agente trabalhar como um engenheiro contínuo, sem
depender só do histórico da conversa.

## active-task/

```
active-task/
  current-goal.md       objetivo da tarefa atual (1 parágrafo)
  execution-plan.md     o plano aprovado (passos)
  todos.json            tarefas detalhadas com status
  changed-files.json    arquivos impactados nesta tarefa
  next-steps.md         o que falta / próxima sessão
```

## Fluxo

Ao receber um pedido não-trivial (ex.: "adicionar módulo financeiro"), o agente:
1. atualiza `current-goal.md` e `execution-plan.md`
2. cria tarefas em `todos.json`
3. mapeia impacto em `changed-files.json`
4. executa
5. roda testes
6. atualiza `next-steps.md`
7. atualiza docs + memória evolutiva + capabilities

Ao concluir uma tarefa e iniciar outra, arquivar o conteúdo relevante em `MEMORY/` e limpar
`active-task/` para o próximo objetivo.
