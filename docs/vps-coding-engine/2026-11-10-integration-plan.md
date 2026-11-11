# FÃŠNIX VPS Coding Engine â€” arquitetura existente e plano de integraÃ§Ã£o

Data: 2026-11-10 Â· Status: **PROPOSTA â€” aguardando aprovaÃ§Ã£o do proprietÃ¡rio** Â· PrÃ©-requisito: LEVEL 1 implantado na VPS.

## 1. Objetivo

A VPS gera, testa e propÃµe cÃ³digo do prÃ³prio FÃŠNIX (e de outros projetos) usando APIs de IA econÃ´micas. O Claude Code fica para arquitetura, auditoria e decisÃµes difÃ­ceis. Nenhum cÃ³digo entra sem diff, testes e aprovaÃ§Ã£o humana.

## 2. O que jÃ¡ existe e funciona (verificado no cÃ³digo)

```
POST /api/v2/jobs {type:'development.execute', prompt, projectPath, gates}
        â”‚  (universal-job-routes.js:307, developer-routes.js:78, IDE visual)
        â–¼
JobEngine (runtime/job-engine.js) â”€â”€ estado persistido no Postgres, retries, DLQ, heartbeat, cancelamento
        â”‚  BullMQ 'fenix-runtime'
        â–¼
worker (runtime/worker.js, container prÃ³prio no compose) â”€â”€ roda sem o Claude Code
        â–¼
SafeDevPipeline.execute (software-factory/safe-dev-pipeline.js:47)
   1. git worktree isolado por job
   2. collectContext (arquivos relevantes, orÃ§amento de 16k chars)
   3. AIGateway.invoke(taskType:'generate')  â† gateway CANÃ”NICO (circuit breaker, retry, cache, telemetria)
   4. applyPlan com polÃ­tica de caminhos
   5. runGates (testes reais no worktree)
   6. git diff â†’ status READY_FOR_REVIEW  (falha de gate â†’ job FAILED, worktree preservado p/ rollback)
```
TambÃ©m existe `development.analyze` (somente leitura) e `agent.execute` (loop escrever â†’ testar â†’ commitar, atÃ© 3 tentativas).

**ConclusÃ£o: nÃ£o criar worker, fila, roteador ou gateway novos.** O trabalho Ã© preencher as lacunas abaixo.

## 3. Lacunas (por ordem de dependÃªncia)

| # | Lacuna | EvidÃªncia | Proposta (reaproveitando o canÃ´nico) |
|---|---|---|---|
| G1 | ProduÃ§Ã£o sem provedor de geraÃ§Ã£o Ãºtil (sÃ³ `ollama` e `echo`; `aiplatform` offline) | `/health` 2026-11-10 | configurar chaves: Groq (jÃ¡ suportado), OpenRouter (novo, 1 provedor `OpenAICompatibleProvider`), opcional Cloudflare Workers AI (idem, endpoint compatÃ­vel OpenAI) |
| G2 | Roteamento nÃ£o usa a lane | `ai-router.js:223` | passar `lane` ao `select()`; mapa laneâ†’(provedor, modelo): FAST=Ollama, STANDARD=Groq/OpenRouter barato, ADVANCED=OpenRouter forte, EXPERT=Claude sÃ³ com flag explÃ­cita no job |
| G3 | Custo fictÃ­cio e orÃ§amento inativo | `ai-gateway.js:265-319, 381-386` | tabela de preÃ§os por env (`FENIX_AI_PRICES_JSON`, valores consultados nos sites dos provedores pelo dono); `setBudget`/`setCostBudget` por tenant e limite por job no payload; job bloqueado (nÃ£o silenciosamente rebaixado) quando estoura |
| G4 | Sem passo de aprovaÃ§Ã£o â†’ integraÃ§Ã£o | job termina em READY_FOR_REVIEW | rota `POST /api/v2/jobs/:id/approve` (`governance:approve`) que faz merge do branch do worktree num branch de integraÃ§Ã£o (nunca `main`, nunca deploy) |
| G5 | Prompt do pipeline nÃ£o injeta liÃ§Ãµes anteriores | `safe-dev-pipeline.js` | opcional, depois do RAG real (LEVEL 5) |
| G6 | Bug tracker nÃ£o ligado | `BUG_TRACKER_MASTER.md` Ã© markdown | importar itens como missÃµes (`MissionKernel`) com `development.analyze` â†’ proposta â†’ `development.execute`; status sÃ³ muda com evidÃªncia do job |
| G7 | Painel de custos | `aiCalls` jÃ¡ registra provedor/modelo/tokens/latÃªncia | view existente de operaÃ§Ãµes lÃª `/api/runtime/ai/usage` **filtrado por tenant** (corrige BUG-008 junto) com 3 colunas: custo zero (local), custo estimado (tabela), custo faturado (sÃ³ quando o provedor devolve) |
| G8 | Fallbacks fabricados no caminho | `fenix-worker.js:164-175` etc. | remover antes de ligar autonomia (LEVEL 2 do roadmap) |

## 4. Fronteiras de seguranÃ§a (obrigatÃ³rias)

- LEVEL 1 implantado e verificado na VPS **antes** de qualquer chave de IA ser configurada.
- O worker sÃ³ escreve em worktree; comandos dos gates via allowlist (`src/security/safe-command.js` ou `runGates`, sem shell).
- `EXPERT` (Claude) nunca Ã© escolhido automaticamente: exige `allowPremium:true` no job + orÃ§amento.
- Nenhum merge em `main`, nenhum deploy: aprovaÃ§Ã£o humana gera branch de integraÃ§Ã£o; deploy continua manual.
- O endpoint de criaÃ§Ã£o de jobs exige papel com escrita (gate central do LEVEL 1).

## 5. Prova de funcionamento (critÃ©rio de aceite da fase)

Num repositÃ³rio de teste isolado na VPS, com o Claude Code fechado:
1. criar job `development.execute` pela API;
2. worker chama um provedor **real** (Groq ou OpenRouter), registra tokens e custo;
3. altera arquivo, roda teste real, produz diff;
4. job fica READY_FOR_REVIEW; aprovaÃ§Ã£o cria branch de integraÃ§Ã£o;
5. reiniciar o worker no meio de outro job â†’ job retomado ou em DLQ, nunca duplicado.
EvidÃªncias: registros de `aiCalls`, `runtimeJobs`, diff e saÃ­da dos testes. Nada de mocks.

## 6. DecisÃµes que dependem do proprietÃ¡rio

1. Quais chaves de API serÃ£o configuradas na VPS (Groq, OpenRouter, Cloudflare, Anthropic)?
2. OrÃ§amento mensal por tenant e teto por job.
3. RepositÃ³rio de teste para a prova (sugestÃ£o: `projects/task-board` ou um repo novo vazio).

## 7. Ordem proposta

1. Deploy do LEVEL 1 + rotaÃ§Ã£o (dono).
2. G8 (remover fabricaÃ§Ã£o no caminho de geraÃ§Ã£o) + G1 (provedores) + G2 (lanes).
3. G3 (custo/orÃ§amento) â†’ prova Â§5.
4. G4 (aprovaÃ§Ã£o) â†’ G7 (painel) â†’ G6 (bug tracker).