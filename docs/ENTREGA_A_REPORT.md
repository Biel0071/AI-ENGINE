# ENTREGA A — Relatório (branch `entrega-a`)

Cadeia exigida: **chat → MissionPlanner (real) → gerente (Orchestrator) → subagente (Developer) → job `code.deliver` → Ollama local → sandbox → persistência na missão → resposta no chat.**

## Status por item

| Item | Status | Evidência |
|---|---|---|
| Chat detecta pedido de código (`build_code`) | PASS | `entrega-a-code-delivery.e2e.test.js` (routing) |
| MissionPlanner real cria missão `CODE` | PASS | e2e mock + LIVE (`missionStatus: SUCCEEDED`) |
| Orchestrator → Developer | PASS | LIVE `managerAgentId: Orchestrator`, `subAgentId: Developer` |
| Job `code.deliver` executado inline | PASS | LIVE inline `workerId: inline:<pid>` |
| Job reivindicado por worker separado (caminho `runBatch` do fenix-runtime-worker) | PASS | LIVE separate `workerId: fenix-runtime-worker-live` (emulado em processo; o PM2 id 9 real NÃO foi usado) |
| Ollama local real (VPS) | PASS | ver medição abaixo |
| Sandbox executa testes do pedido | PASS | 2/2 (`add(2,3)`, `add(-1,1)`) |
| Sandbox bloqueia fs fora do tempdir (Node 20 `--experimental-permission`) | PASS | probe: `Access to this API has been restricted` |
| Sandbox bloqueia `child_process` | PASS | probe: `module "child_process" is blocked` |
| Persistência (`mission.delivery`) | PASS | LIVE `persisted: true` |
| Resposta honesta no chat (missão, job, worker, modelo, testes, código) | PASS | e2e mock asserts sobre `out.reply` |
| Modelo indisponível → `MODEL_UNAVAILABLE`, nenhum código fabricado | PASS | e2e |
| Código errado → `TESTS_FAILED`, missão FAILED | PASS | e2e |
| LIVE BLOCKED não pode parecer PASS | PASS | BLOCKED agora falha o teste → exit 1 (verificado local e na VPS) |
| `e2e-smoke.test.js` termina sozinho | PASS | ✔ 1/1, processo saiu com exit 0 sem force-exit (≈54 s de parede; teste 14 s) |
| `runAutopilot` (`omega/human-digital-twin.js`) | EXCLUÍDO (stub conhecido) | Retorna contexto fabricado/hardcoded; por decisão de produto NÃO foi conectado nem simulado e não faz parte da cadeia |
| Deploy em produção (`/opt/fenix-os`, PM2) | NOT TESTED | Fora do escopo; nada foi tocado |
| Fluxo pela UI (browser → `/api/chat`) | NOT TESTED | Só via `app.chat.handle` |

## Medição LIVE (VPS 209.50.241.22, checkout temporário `/tmp/entrega-a-check`, já removido)

- Node **v20.20.2**; sandbox usou `--experimental-permission` (wildcard de diretório para Node 20), netns + module guard.
- Modelo: **qwen2.5-coder:1.5b** via `http://127.0.0.1:11434`.

| Modo | Wall | Load | Prompt eval | Gen | Tokens (prompt+gen) | Pico RSS | Exit |
|---|---|---|---|---|---|---|---|
| inline | 11.5 s (processo 13.4 s) | 5.2 s | 3.7 s | 1.5 s | 130+25=155 | 124.5 MB | 0 |
| worker separado | 11.7 s (processo 20.9 s) | 4.3 s | 2.8 s | 3.8 s | 130+25=155 | 124.8 MB | 0 |

Código gerado (idêntico nos dois modos), 2/2 testes em sandbox:
```javascript
module.exports = {
  add(a, b) {
    return a + b;
  }
};
```
BLOCKED (URL inalcançável): `[live-result] {"verdict":"BLOCKED",...}` e **exit 1**.

## Correções desta rodada e da anterior

1. (anterior) `local-coder-client.js`: expõe métricas do Ollama (`loadMs`, `promptEvalMs`, `evalMs`, tokens) → `mission.delivery.metrics.ollama`.
2. (anterior) Teste e2e: modo hermético (`FENIX_TEST_MODE`), hard-timeout de 300 s, LIVE limitado (probe 5 s, timeout 180 s), linha `[live-result]` legível por máquina, modo `LIVE_SEPARATE_WORKER`.
3. LIVE BLOCKED: era `t.skip` (lia como sucesso) → agora `assert.fail` (exit ≠ 0).
4. Hang do e2e-smoke — causa-raiz medida com sonda de timers (não era StorageManager): `Kernel.scanDirectory` faz `require()` de todo `src/`, o que
   - executava `evolution/factory-worker.js` (script standalone) dentro do servidor, criando `setInterval(5000)` ref'd e arquivos de heartbeat com o PID do servidor → agora guarda `if (require.main !== module) return;`;
   - instanciava o singleton `AutonomousEcosystemEngine` com watchdog `setInterval(2500)` ref'd → agora `unref()`.
   Asserções do teste inalteradas.

## Riscos conhecidos
- Após o teste do smoke ainda há ~40 s até o processo sair (timers finitos restantes não investigados).
- Teste com um único pedido trivial (`add`); qualidade do modelo em tarefas maiores não medida.
- `unref()` no watchdog: em processos sem servidor HTTP o watchdog não mantém mais o processo vivo (intencional).
