# Entrega A — FÊNIX Autonomous Core na VPS (design)

Data: 2026-11-13 · Abordagem escolhida pelo dono: **1 — evoluir a cadeia existente** ("rodar todas até finalizar na melhor ordem").

## Objetivo

Provar na VPS, sem nenhuma IA externa, o ciclo:
Chat → MissionPlanner → Orchestrator (gerente) → Developer (subagente) → JobEngine → `fenix-runtime-worker` (PM2) → Ollama local → sandbox → testes → persistência → eventos → resposta no chat.
Com worker persistente, modo honesto sem Ollama, telemetria real, limites de recursos e certificação com evidências.

## O que já existe (não recriar)

| Peça | Arquivo | Estado |
|---|---|---|
| Ciclo chat → missão CODE → job `code.deliver` → Ollama → sandbox | `src/execution/code-delivery-pipeline.js` | funciona, **1 modelo, 1 tentativa** |
| Cliente do modelo local | `src/ai-runtime/local-coder-client.js` | modelo fixo, sem limite de threads |
| Fila, claim, heartbeat, recuperação de job órfão, retry com backoff, timeout, cancelamento, pausa | `src/runtime/job-engine.js` | funciona; falha de dependência consome tentativa e vira DEAD_LETTER |
| Projeção job → passo → missão | `src/missions/mission-kernel.js` | sem estado de bloqueio |
| Worker PM2 | `src/runtime/worker.js` (`fenix-runtime-worker`, concorrência 1, stale 10 min) | rodando |
| Telemetria do host | `GET /api/v2/telemetry/live` em `src/api/universal-system-routes.js` | CPU, RAM, disco, rede; sem swap, serviços, filas, Ollama |

## Medições que embasam o desenho (VPS, 2026-11-13)

4 CPUs AMD EPYC (AVX2/FMA), 5,9 GB RAM (~1,2–2,9 GB disponíveis), sem GPU, disco 95% (5,1 GB livres). Ollama 0.31.2 com `OLLAMA_MAX_LOADED_MODELS=1` e `OLLAMA_NUM_PARALLEL=1`. A geração ocupa as 4 CPUs (load 4,9–6,5).

Testes de aceitação (3 tarefas, chamada direta ao Ollama): `qwen2.5:3b` 9/9 (~17–20 s), `qwen2.5-coder:3b` 8/9, `qwen2.5-coder:1.5b` 7/9 (~13 s), `granite3.1-moe:3b` 4/9. MoE grande (gpt-oss:20b, Qwen3-30B-A3B) não cabe em RAM nem em disco.

## Design

### 1. Cascata de modelos com feedback dos testes (`CodeDelivery.handleJob`)
- `FENIX_CODER_CASCADE` (lista separada por vírgula, no máximo 3; padrão = `FENIX_CODER_MODEL`, então sem a variável o comportamento antigo se mantém). Produção: `qwen2.5-coder:1.5b,qwen2.5:3b`.
- A tentativa *n* usa o modelo *n*. Se os testes falham ou não há bloco de código, a tentativa seguinte recebe o código anterior e os erros dos testes.
- O resultado registra `attempts[]` (modelo, status, testes, duração, tokens). Sucesso só quando o sandbox passa.
- `LocalCoderClient.generate(prompt, { signal, model })` aceita modelo por chamada e envia `options.num_thread` = `FENIX_CODER_NUM_THREAD` quando definido (produção: 3, sobra 1 núcleo para o resto da VPS).

### 2. Guarda de recursos (`src/runtime/resource-guard.js`)
- Antes de cada geração: lê `MemAvailable` de `/proc/meminfo` e o tamanho do modelo em `/api/tags`; exige `tamanho + FENIX_CODER_RAM_MARGIN_MB` (padrão 512). Se o modelo já está carregado (`/api/ps`), não exige RAM extra. Fora do Linux, ou sem leitura, o resultado é `UNKNOWN` e não bloqueia (não inventa medição).
- Um modelo por vez já é garantido pelo Ollama (`MAX_LOADED_MODELS=1`) e pela concorrência 1 do worker.

### 3. BLOQUEADO quando a dependência falta (JobEngine + MissionKernel)
- O handler lança `DependencyBlockedError { code: 'DEPENDENCY_BLOCKED', dependency: 'ollama' | 'memory', reason }` quando a **primeira** geração não é possível (Ollama fora, modelo ausente, RAM insuficiente). Sem código, sem teste, sem sucesso.
- JobEngine: erro com `code === 'DEPENDENCY_BLOCKED'` → status `BLOCKED`, `blockedOn`, `blockedSince`, `scheduledFor = agora + FENIX_BLOCKED_RETRY_MS` (padrão 60 s); **a tentativa não é consumida**; evento `runtime.job.blocked`. `runBatch` trata `BLOCKED` vencido como devido: o worker reivindica, o handler testa a dependência de novo e segue ou volta a `BLOCKED`. Depois de `FENIX_BLOCKED_MAX_MS` (padrão 24 h) vira `DEAD_LETTER` com o motivo. `cancel` cancela um job `BLOCKED` na hora.
- MissionKernel: `runtime.job.blocked` → passo e missão `BLOCKED` (não terminais, missão preservada); `runtime.job.started` de um passo `BLOCKED` devolve passo e missão a `RUNNING`.
- Chat: `requestFromChat` para de esperar em `BLOCKED` e responde: dependência indisponível, missão preservada e bloqueada, retomada automática, nenhum código gerado.
- Tarefas determinísticas (passos sem IA, inspeções, consultas de estado) não passam por esse handler e seguem rodando.

### 4. Telemetria real (`GET /api/v2/telemetry/live`, evoluído)
Acrescenta, cada bloco com `measuredAt` e `status` (`MEASURED` ou `UNAVAILABLE` com motivo):
- memória: `availableMb` e swap (de `/proc/meminfo`);
- `services`: PM2 (`pm2 jlist`: nome, estado, reinícios, memória, CPU), Postgres/store (tempo de leitura), Redis (ping, quando configurado), Ollama (`/api/version`, `/api/ps` com modelos carregados e RAM, latência);
- `runtime`: jobs por estado, `BLOCKED` com dependência, heartbeats dos workers (vivo ≤ 30 s), dead letters, últimos erros, latência das últimas entregas de código.
Cache de 5 s para não pesar na VPS. Falha de leitura vira `UNAVAILABLE`, nunca valor inventado.

### 5. Limites (todos por variável, com padrão)
Concorrência do worker 1 (existente) · RAM mínima (guarda) · tempo do job (`limits.timeoutMs`, existente) e do modelo (`FENIX_CODER_TIMEOUT_MS`) · tokens por geração (`FENIX_CODER_MAX_TOKENS`) · custo 0 (só local) · código ≤ 20 KB (existente) · tentativas da cascata = tamanho da lista (máx. 3) · retry do job (existente) · bloqueio máximo 24 h.

### 6. Certificação na VPS (`scripts/entrega-a-certify.js`, só leitura + evidências)
Roda na VPS e grava um JSON de evidências usado no relatório:
1. **Ciclo completo:** a ordem entra pelo chat real da interface (sessão do dono no navegador). O script coleta do store missão, passos, job, worker, tentativas, modelo, testes, eventos e resposta.
2. **Worker persistente:** durante um job, `pm2 restart fenix-runtime-worker`; prova recuperação e ausência de execução duplicada.
3. **Navegador fechado:** ordem enviada, aba fechada, resultado gravado na missão.
4. **Sem Ollama:** `systemctl stop ollama` por no máximo 2 minutos (afeta ZapAI e API Platform nesse intervalo); prova `BLOCKED` sem código; religa e prova a retomada.
5. **Telemetria:** captura do endpoint com timestamps.
O relatório separa: testado em produção / testado local / não testado / bloqueado.

### 7. Reconciliação dos testes
Rodar a suíte completa local com saída bruta salva; contar ok/not ok/skip; listar falhas por arquivo e classificar (preexistente, nova, instável) contra a lista conhecida. Nenhum teste é alterado para passar. Os testes cujo comportamento mudou por pedido (MODEL_UNAVAILABLE → BLOCKED) são reescritos para o novo comportamento e listados no relatório.

### 8. Produção e rollback
Antes do deploy: backup do documento de estado (Postgres `fenix.kernel_state`) e dos arquivos, `rollback.sh` gerado. Sem migração de schema: os campos novos são opcionais em `runtimeJobs` e `missions`. A versão anterior ignora campos extras, mas não conhece `BLOCKED`; por isso o `rollback.sh` devolve jobs `BLOCKED` para `QUEUED` e missões `BLOCKED` para `RUNNING` antes de reiniciar.

## Fora do escopo
Entrega B/C, Percepção (Agent-aware), modelo MoE grande, chaves de nuvem, mudança de política de aprovação, correção permanente da API Platform (sessão separada).

## Critério de pronto
Ciclo completo comprovado em produção sem IA externa; recuperação após restart do worker sem duplicar; BLOQUEADO honesto e retomada com Ollama; telemetria com valores reais e timestamps; suíte reconciliada; deploy com backup e rollback verificados; relatório PASSOU / FALHOU / BLOQUEADO / PRÓXIMA AÇÃO com IDs.