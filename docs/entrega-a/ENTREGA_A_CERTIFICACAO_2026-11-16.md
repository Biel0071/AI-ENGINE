# Entrega A — Certificação em produção (2026-11-16)

Ambiente: **produção**, VPS 209.50.241.22, `fenix-backend` (PM2 12) + `fenix-runtime-worker` (PM2 9), Postgres do FÊNIX, Redis, Ollama 0.31.2 local. Nenhuma IA externa. Sessão real do dono (`grg-admin`) no navegador; pedidos enviados pela rota do chat da interface (`POST /api/chat/stream`) de dentro da página autenticada.
Código implantado: `ca1352ec` (cascata, BLOCKED, guarda de RAM, telemetria) e `5161954f` (correção do despacho duplicado), branch `entrega-a-autonomy`.
Evidências brutas na VPS: `/root/entrega-a-evidence-20261116/` (coletadas por `scripts/entrega-a-evidence.js`, só leitura).

## PASSOU (testado em produção)

| Prova | Missão / job | Evidência |
|---|---|---|
| Ciclo completo chat → MissionPlanner → Orchestrator → Developer → JobEngine → worker PM2 → Ollama local → sandbox → testes → persistência → eventos → resposta | missão `3931cfc3-3676-4581-908a-7a937cc44b63`, job `c604ddb5-068d-46af-bd78-449e64361ba1` | HTTP 200 em 54 s; SUCCEEDED; `qwen2.5-coder:1.5b` 11,7 s; sandbox Docker rootless, rede `none`, 128 MB, 64 PIDs: 3/3; worker `ee658d4b…` (fenix-runtime-worker); 1 job |
| Worker reiniciado com o job em execução | missão `d4afb920-65b9-4932-a74c-d91b7a52e6cf`, job `e852c486-3580-47f6-b2d8-abeb835606f6` | restart 11:39:42; "worker heartbeat expired; job recovered by scheduler"; tentativa 2; SUCCEEDED, TESTS_PASSED; 1 job (sem duplicação) |
| Navegador fechado | missão `2e8d1d89-d11b-453c-b4f4-655fb0ee9529`, job `18bd8eac` | aba fechada 4 s após o envio; missão SUCCEEDED, 3/3, 1 job |
| Ollama indisponível → BLOQUEADO honesto → retomada | missão `9c5978ae-59c9-4d0a-a106-6fd3dfe54214`, job `c868bcb6-251e-48ed-b7e1-fca8feb7dd1f` | Ollama parado 33 s (11:42:14–11:42:46); chat: "Dependência indisponível (ollama)… missão preservada… Nenhum código foi gerado"; job BLOCKED com 0 tentativas consumidas; retomada automática 11:43:43; SUCCEEDED 3/3; 1 tentativa, 1 bloqueio |
| Telemetria real com timestamps | `GET /api/v2/telemetry/live` (HTTP 200) | CPU, RAM disponível, swap, disco, PM2, store, Redis (1–8 ms), Ollama (3–26 ms), workers vivos (3), jobs por estado, BLOCKED, erros recentes, latência de entrega (média 19 s, 6 amostras); cada bloco com `measuredAt` |
| Deploy com backup e rollback | `/var/backups/fenix-deploy-ca1352ec-20261114T001548Z`, `/var/backups/fenix-deploy-5161954f-20261116T113425Z` | hashes implantados = commit; backup do estado (versões 2.589.638 e 2.675.866, schema 44) com SHA-256 conferido; `rollback.sh` validado (`bash -n`), não executado |
| Limites | ambiente PM2 | cascata `qwen2.5-coder:1.5b,qwen2.5:3b` (máx. 3), `FENIX_CODER_NUM_THREAD=3`, 1 modelo carregado, concorrência 1 por worker, RAM mínima (guarda), timeout do modelo 120 s, código ≤ 20 KB, custo 0, bloqueio máx. 24 h |

## FALHOU e foi corrigido durante a certificação

- **Despacho duplicado em produção** (missão `6b64e96e-cae2-4f43-9a30-b4583b355d65`): o passo foi despachado duas vezes e dois workers executaram o mesmo trabalho (jobs `64621548` e `c3e650d0`). Causa anterior a esta entrega: `reconcile()` liberava uma reserva DISPATCHING após 5 s, e cada gravação do estado em produção leva vários segundos. Correção `5161954f`: o job leva `missionStepId`, a reconciliação adota o job já criado e a janela de órfão passou a 120 s. Depois da correção, todos os ciclos tiveram 1 job; a adoção foi observada em produção (`mission.step.reconciled DISPATCHED`).
- **Chat respondia `NOT_DISPATCHED`** (mesma missão): corrigido no mesmo commit; o chat espera o passo ganhar job.

## BLOQUEADO / limites conhecidos

- O chat não abriu pela interface nesta largura de painel (botões "Chat"/"Chat Copilot" sem efeito na cidade); o pedido foi enviado pela mesma rota do chat a partir da página autenticada. Achado de UX para corrigir.
- Na resposta do teste de restart, a missão ainda aparecia RUNNING (job já SUCCEEDED): atraso de projeção; o estado final foi SUCCEEDED.
- Em produção, o backend também executa jobs (worker local `fenix-local:<pid>`) além do `fenix-runtime-worker`. Ambos recuperam jobs órfãos; a duplicação foi resolvida pela reserva atômica + adoção.
- `qwen2.5:3b` (segundo nível da cascata) não foi exercitado em produção: todos os pedidos passaram na primeira tentativa. Coberto por teste local.
- Disco em 96% (4,4 GB livres); crescimento do banco ZapAI é a causa principal (sessão separada).
- 100 dead letters antigos no estado; anteriores a esta entrega.
- Testes: suíte completa local 2.068 testes, 1.952 aprovados, 113 falhas, 3 pulados. Nenhuma regressão determinística desta entrega (100 falhas também falham antes; 12 passam isoladas; 1 falha igual na versão anterior). O reparo automático de missões ainda marca SUCCEEDED trabalho não feito para falhas que não sejam de dependência (decisão do dono).

## PRÓXIMA AÇÃO

1. Juntar `entrega-a-autonomy` com o trabalho sem commit no checkout `entrega-a` (outra ferramenta editou os mesmos arquivos).
2. Corrigir a abertura do chat na cidade em telas estreitas.
3. Decidir sobre o reparo automático que fabrica sucesso.
4. Depois disso, a etapa Percepção (Agent-aware) do roteiro.