# FÊNIX OS — TABELA DE COMANDOS DE VOZ

| Comando por Voz | Intent Alexa | Ação no Fênix OS |
|---|---|---|
| *"Alexa, como está o Fênix?"* | `FENIX_STATUS` | Retorna contagem de jobs, agentes trabalhando e saúde geral. |
| *"Alexa, quais tarefas estão rodando?"* | `FENIX_LIST_JOBS` | Lista os jobs ativos e progresso percentual. |
| *"Alexa, posso aprovar o job?"* | `FENIX_APPROVE_JOB` | Concede consentimento humano para jobs de risco (`QUEUED`). |
| *"Alexa, pause o job atual."* | `FENIX_PAUSE_JOB` | Pausa a execução do job no backend. |
| *"Alexa, retome o job."* | `FENIX_RESUME_JOB` | Retoma o job pausado. |
| *"Alexa, abra o projeto Vendas."* | `FENIX_OPEN_PROJECT` | Define o projeto ativo no workspace da IDE. |
| *"Alexa, diga ao Fênix para corrigir os bugs do projeto X."* | `FENIX_FIX_PROJECT` | Cria um Job no FÊNIX MIND, decompõe em DAG e ativa agentes. |
| *"Alexa, peça ao Fênix para testar o projeto."* | `FENIX_RUN_TESTS` | Dispara suítes de testes unitários reais. |
| *"Alexa, pesquise como implementar OAuth 2.0."* | `FENIX_RESEARCH` | Executa a ferramenta de Web Research e salva na memória. |
