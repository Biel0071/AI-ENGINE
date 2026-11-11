# Plano de evolução do Fênix a partir dos vídeos — PROPOSTA (2026-11-11)

Base: `VIDEO_REVERSE_ENGINEERING.md` e `REFERENCE_FEATURE_MATRIX.md` (mesma pasta). Aguarda aprovação do dono. Nada aqui foi implementado ainda.

## Princípio

Os vídeos mostram que o que torna um "escritório de agentes" útil não é o 3D: é **ver cada agente com dados reais, mandar uma ordem, e aprovar o que importa**. O Fênix já tem o motor (missões, jobs, aprovação no backend, chat por agente, MCP); falta ligar isso na tela. As fases abaixo reaproveitam o que existe — nenhum sistema paralelo.

## Fase 0 — Pré-requisito: desempenho (tarefa separada)

Medido: a página da Cidade bloqueia o navegador por 3–25 s sem GPU; o servidor gasta 4–7 s por gravação no store (documento único de 3,9 MB copiado a cada leitura).
- Leitura do store sem cópia profunda (cópia só na gravação) e conversas/jobs/chamadas de IA em tabelas próprias.
- Cidade: qualidade baixa automática quando o quadro passa de 50 ms.
- **Pronto quando:** `/health` < 100 ms na mediana; abrir conversa < 1 s; teste `level23` passa em 240 s.

## Fase 1 — Diretor + fila de aprovação (matriz 1, 2, 3)

- Fila "Precisa de você" na Cidade (contador no topo + painel) e no chat do Fênix, listando passos de missão em `AWAITING_APPROVAL` com Aprovar/Recusar → `missions.approveStep` (já existe).
- O Fênix como diretor: "Enviar ordem" cria missão com passos por agente; cada passo aparece na sala do agente.
- Política "nasce pausado": deploy, envio externo e gasto → passo com aprovação obrigatória (estende o portão do LEVEL 1).
- **Pronto quando:** teste de ponta a ponta — ordem → missão → passo pausado → aprovar na tela → job executa → evento na Cidade.

## Fase 2 — Agentes com dados reais (matriz 4, 5, 11)

- Cartão do agente: modelo e provedor da última chamada, tokens de hoje (`aiCalls`), tarefa e missão atuais, último heartbeat.
- Painel flutuante (Proposta B da spec 2026-11-10): corpo inteiro, mini-chat, histórico de jobs e tokens.
- "Status de todos": resposta montada pelo runtime (heartbeat + job atual), sem gastar IA.
- **Pronto quando:** cada número do cartão tem origem rastreável (teste de honestidade estendido); nenhum "—" onde existe dado.

## Fase 3 — Respostas com fonte (matriz 6)

- O chat mostra "Fonte:" (arquivo, rota, memória ou estado do runtime) abaixo da resposta, a partir do que a camada 1 colocou no prompt.
- Envio de documento da empresa para a memória do projeto e resposta citando o arquivo.
- **Pronto quando:** "como vejo os tokens gastos?" responde com a tela real e a fonte; pergunta sem dado responde "não encontrei".

## Fase 4 — Cidade viva com dados (matriz 8, 9, 10)

- Placa do prédio: jobs ok/falha nas últimas 24 h, tokens, último evento.
- Pulso curto no prédio quando um job conclui ou falha (eventos SSE reais).
- Setores dentro do prédio por papel do agente.
- Barra de rotinas real: Pausar/retomar fila, Rotinas autônomas on/off.
- **Pronto quando:** um job real disparado na VPS acende o prédio certo em até 5 s.

## Fase 5 — Memória única entre ferramentas (matriz 7)

- Livro de Atividades (Proposta A da spec 2026-11-10): ferramentas MCP `fenix_record_activity` e `fenix_get_project_history`; ingestão do histórico Git dos projetos.
- O que o Codex, o Antigravity ou o Claude Code fizerem vira atividade, ligada a missão/job, visível no calendário.
- **Pronto quando:** um commit feito fora do Fênix aparece na linha do tempo do projeto.

## Fase 6 — Operação e segurança (matriz 12, 13, 14)

- Linha do tempo das ações nas instâncias de navegador.
- Varredura de segurança em sandbox, só nos repositórios do dono, gerando bugs com prova de conceito.
- Kanban de missões na tela Work.

## Fase 7 — Fábrica e design (matriz 15–19)

Pipelines do Studio e da fábrica com referência visual, skills de design/vídeo e modelos (funil, site 3D). Prioridade baixa.

## Economia de tokens (vale para todas as fases)

O roteador já prefere o modelo local (Ollama) e não usa provedor de teste; a camada 1 limita o contexto. Nas fases 2 e 4 os números vêm do runtime, sem chamar IA. IA paga só para planejar missões e revisar código (decisão de orçamento do dono).

## Ordem sugerida

Fase 1 → Fase 2 → Fase 3 nesta sequência (cada uma visível e testável em poucos dias), com a Fase 0 em paralelo como tarefa separada. Fases 4–7 depois.