# IMPROVEMENT_OPPORTUNITIES — FÊNIX OS

Data: 2026-11-10. Regra usada: cada oportunidade resolve um problema **encontrado nesta auditoria** ou produz ganho mensurável. Nada é recomendado só por ser moderno.
Ordenado por impacto estimado (segurança e confiabilidade antes de recursos).

| # | Oportunidade | Problema que resolve | Ganho mensurável | Base existente a reaproveitar | Esforço |
|---|---|---|---|---|---|
| OP-01 | **Fechar a superfície de ataque** (backdoor, preview, terminal, rotas públicas, segredos) | BUG-001..004, 008..011 | 0 rotas de escrita/execução sem `authorize`; 0 segredos no git | `controlPlane.authorize`, `requirePermission` | M |
| OP-02 | **Produção em modo production** | echo e guardas desligadas | `/health` = production, sem echo | guardas já escritas (`app.js:162-168`) | P |
| OP-03 | **Restaurar a suíte verde e torná-la gate de deploy** | 391 falhas; deploy sem gate | ≥ 95% de aprovação, CI bloqueando merge | `fenix-ci.yml` já existe | M |
| OP-04 | **Um único caminho de IA (AIRouter + AIGateway)** | 8 roteadores, chat fora da contabilidade | 100% das chamadas com telemetria e custo | `ai-runtime/*` é o melhor código do sistema | G |
| OP-05 | **Eliminar sucesso fabricado** | 9+ pontos com `success:true` falso | 0 respostas fabricadas; falhas visíveis | padrão `AI_PROVIDER_UNAVAILABLE` da fast lane; `fabricated-response.js` | M |
| OP-06 | **Roteamento por lane e custo** (Ollama → Groq/OpenRouter → Claude/Codex) | custo sem controle; um provedor offline derruba o chat | custo por tarefa ↓ [HIPÓTESE: 60–80% das chamadas são "fast"]; disponibilidade com 3 tiers | tiers e lanes já existem; falta passar `lane` e o mapa de modelos | M |
| OP-07 | **Orçamento por tenant real** | `setBudget` sem chamadores, preços fictícios | limite diário/mensal aplicado; alerta antes de estourar | lógica de reserva pronta em `ai-gateway.js:265-319` | M |
| OP-08 | **Embeddings reais + correção do KnowledgeGenome** | RAG por hash; cápsulas não indexadas | recall mensurável num conjunto de perguntas de referência | cliente Qdrant real; `assertDeterministicEmbedding` | M |
| OP-09 | **Tirar coleções quentes do documento único** | ~25 s por escrita sob disputa; runs presos | p95 de escrita < 50 ms | interface `store` e retenção do Postgres já existem | GG |
| OP-10 | **Uma fila, um consumidor** | JobQueueManager duplicado; API e worker consumindo | 0 jobs duplicados/perdidos em teste de 2 processos | JobEngine com DLQ | G |
| OP-11 | **Isolamento de tenant completo** | GraphBrain, AgentRegistry, PatternLibrary, WebSocket | teste de 2 tenants sem vazamento | stores já chaveados | G |
| OP-12 | **Agentes reais no lugar do pool simulado** | `setTimeout` marca tarefas concluídas | toda tarefa aprovada vira job `agent.execute` com evidência (diff, testes) | `agent-execution-runtime` + `safe-dev-pipeline` já funcionam | M |
| OP-13 | **Todo PATCH de agente via Safe Dev Pipeline** | orquestrador sobrescreve arquivos | 0 escritas fora de worktree; todo diff revisável | `software-factory/safe-dev-pipeline.js` | M |
| OP-14 | **Política de agente fora do LLM** | `policyAllows`/`commit` vêm do JSON do modelo | decisão de commit só por política declarada | governança existente (`governance/`) | P |
| OP-15 | **Registro de projetos único** (ProjectKernel) | 5 fontes de projetos, array fixo com caminhos locais | 1 fonte; projetos por tenant | `projects/project-kernel.js` já é tenant-scoped | G |
| OP-16 | **Kernel com registro explícito + remoção de código morto** | require de 552 arquivos no boot; ~15 diretórios mortos | boot mais rápido [medir]; −10–15% de linhas | lista de mortos neste relatório | M |
| OP-17 | **Deploy por imagem imutável** | código montado do host; deploy documentado errado | rollback em 1 comando; versão rastreável | compose enterprise + CI com build e Trivy já existem | M |
| OP-18 | **Frontend honesto e conectado** | valores fictícios; ≥10 endpoints inexistentes | 0 fallbacks numéricos; 0 `fetch` para rota inexistente (teste estático) | `frontend-honesty-audit` existente — só ampliar regras | M |
| OP-19 | **Ciclo de vida por view no frontend** | 7 intervalos e 4 loops rAF sempre ativos; SSE duplicado | CPU ociosa ↓; 1 conexão SSE | evento `fenix:viewchanged` já existe | M |
| OP-20 | **Cidade como painel de operações real** | camadas paralelas; telemetria simulada em outras áreas | cada animação corresponde a um evento real de job/missão; inspeção mostra job, logs e diff | A*, raycast e sincronização com backend já funcionam em `fenix-world-3d.js` | G |

## Oportunidades de autonomia (dependem das acima)

- **Ciclo "detectar → propor → provar → pedir aprovação":** o loop autônomo, o MissionKernel e o Safe Dev Pipeline já existem; ligá-los gera melhorias com diff + testes + aprovação humana, sem promoção automática (alinhado à governança de evolução do projeto).
- **Self-healing baseado em evidência:** o `self-healing-engine` hoje pode subir o worker com fallback fabricado; com OP-05 ele passa a reiniciar componentes e registrar falhas reais.
- **Memória de engenharia útil:** com embeddings reais (OP-08), lições de jobs que falharam e foram corrigidos podem ser recuperadas no prompt do próximo agente — ganho medido por taxa de sucesso na 1ª tentativa de `agent.execute`.
- **MCP como porta de entrada para Claude Code, Codex e Antigravity:** `bin/fenix-mcp.js` já existe; expor missões/jobs/projetos por MCP permite que essas ferramentas usem o FÊNIX como control plane sem cada uma virar "provedor".

## O que **não** recomendamos agora

- Novos agentes, novas views ou novos motores visuais antes de OP-01..OP-05.
- Trocar Postgres/Qdrant/BullMQ: a stack é adequada; o problema é o modelo de dados (documento único) e a duplicação.
- Reescrever o frontend: a Regra III do projeto (evoluir, não recriar) é correta; o caminho é poda e consolidação.