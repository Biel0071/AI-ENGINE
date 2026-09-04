# FÊNIX AI City — interação

## Navegação

Cada agente, estação e missão deve levar ao contexto correspondente no shell
unificado. O estado da rota/hash preserva a tela atual em refresh.

## Ações

- selecionar agente abre o Agent Desk e seus dados reais;
- selecionar missão abre progresso, jobs, logs e bloqueios;
- solicitar ação passa pelo policy/approval engine;
- handoff é criado e acompanhado por evento, nunca por mudança apenas visual;
- terminal, arquivo, Git e memória exibem erro explícito quando o backend não
  estiver disponível.

Operações destrutivas ou de alto risco exigem aprovação humana independente.
