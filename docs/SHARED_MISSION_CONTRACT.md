# SHARED MISSION CONTRACT (CONTRATO COMPARTILHADO DE 19 CAMPOS)

**Status:** HOMOLOGADO E ATIVO
**Implementação:** `AutonomousMissionQueue.enqueue()`, `AutonomousMissionQueue.toSharedMissionContract()`, `AutonomousMissionQueue.handoffMissionProvider()`
**Rotas de API:**
- `GET /api/v2/autonomous/v6/contract/:missionId`
- `POST /api/v2/autonomous/v6/handoff`
- `POST /api/v2/autonomous/v6/execute-mission`

---

## 1. Estrutura Obrigatória (19 Campos)

Toda missão criada na `AutonomousMissionQueue` mantém e expõe os 19 campos canônicos do `SharedMissionContract`:

```json
{
  "missionId": "evo-mis-1793714000000-a1b2c3",
  "projectId": "fenix-os",
  "objective": "Certificar ciclo multiambiente V6 com revisão independente",
  "scope": "multi-provider-v6-certification",
  "acceptanceCriteria": [
    "Contrato compartilhado deve conter todos os 19 campos obrigatórios",
    "Roteamento deve testar disponibilidade real de API Platform, Antigravity e Codex",
    "Teste automatizado real deve passar com exitCode === 0",
    "Validação final deve ser assinada por validatorAgentId !== authorAgentId"
  ],
  "priority": "P1",
  "assignedProvider": "antigravity",
  "assignedAgent": "agent-verifier-independent",
  "branch": "main",
  "worktree": "worktrees/fenix-os/evo-mis-1793714000000-a1b2c3",
  "lockedFiles": [
    "ai-engine/grg/test/autonomous-routes-truth.test.js"
  ],
  "dependencies": [],
  "budget": {
    "maxTokens": 16000,
    "maxCostUsd": 0.5,
    "maxDurationMs": 120000
  },
  "deadline": "2026-11-03T15:00:00.000Z",
  "executionStatus": "COMPLETED",
  "changedFiles": [
    "ai-engine/grg/test/autonomous-routes-truth.test.js"
  ],
  "testResults": {
    "executed": true,
    "exitCode": 0,
    "passed": true
  },
  "evidence": [
    {
      "evidenceId": "ev-1793714000100",
      "testExitCode": 0,
      "sha256": "..."
    }
  ],
  "reviewStatus": {
    "status": "APPROVED",
    "authorAgentId": "agent-developer",
    "validatorAgentId": "agent-verifier-independent",
    "independentConfirmed": true,
    "reviewedAt": "2026-11-03T13:30:00.000Z",
    "notes": "Revisão independente concluída (exitCode=0)"
  }
}
```

---

## 2. Regras de Handoff e Revisão Independente

1. **Continuidade Multiambiente (`handoffMissionProvider`)**: Qualquer ambiente (`api-platform-vps`, `antigravity`, `codex`) pode assumir uma missão iniciada por outro preservando integralmente `lockedFiles`, `changedFiles`, `branch`, `worktree`, `acceptanceCriteria`, `evidence` e o histórico completo em `providerChain`.
2. **Prevenção de Conflitos (`acquireLease`)**: Dois agentes nunca editam o mesmo arquivo simultaneamente (`FILE_LOCK_CONFLICT`).
3. **Invariante de Revisão Independente**: Quando `reviewStatus.status === 'APPROVED'`, o método valida obrigatoriamente que `validatorAgentId !== authorAgentId`. Tentativas de autoaprovação lançam erro explícito de violação de governança.
