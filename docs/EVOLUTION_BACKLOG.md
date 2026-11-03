# EVOLUTION BACKLOG (FILA PRIORIZADA DE EVOLUÇÃO CONTÍNUA)

**Status:** PERSISTIDO EM DISCO E DEDUPLICADO POR `problemHash`
**Fonte Persistente:** `ai-engine/memory/AUTONOMOUS_EVOLUTION_QUEUE.json`
**Gerenciador:** `AutonomousMissionQueue` (`P0` a `P7`)

---

## 1. Escala de Prioridades (`MissionPrioritizer`)

| Prioridade | Rank | Categoria | Regra de Acionamento |
|---|---|---|---|
| **P0** | 0 | Produção Parada / Crash | Indisponibilidade de servidor HTTP, crash de processo PM2 ou corrupção de banco |
| **P1** | 1 | Segurança / Perda de Dados / Persistência | Degradação do `StorageManager`, falha de autenticação ou violação de contrato multiambiente |
| **P2** | 2 | Função Crítica Quebrada | Rota de API retornando 5xx ou falha em teste E2E |
| **P3** | 3 | Dados Inconsistentes | Divergência entre telemetria de backend e indicadores de UI |
| **P4** | 4 | UX / Fluxo Quebrado | Botão sem handler, modal travado ou falha de navegação |
| **P5** | 5 | Qualidade Visual / Layout | Sobreposição de elementos, clipping ou desalinhamento |
| **P6** | 6 | Performance / Latência | Queda de FPS no World 3D, queries lentas ou excesso de chamadas |
| **P7** | 7 | Novas Capacidades | Expansões incrementais planejadas pelo `AutonomousEvolutionKernel` |

---

## 2. Mecanismos de Governança do Backlog

- **Deduplicação Criptográfica**: Cada problema gera um `problemHash` normalizado (`SHA-256` de 16 caracteres sobre `projectId + problem`). Problemas idênticos não geram missões duplicadas.
- **Recuperação Pós-Reinicialização (Cold-Restart)**: Missões em estados transitórios (`ANALYZING`, `PLANNED`, `EXECUTING`, `TESTING`) durante um reinício têm seus leases limpos e retornam automaticamente para `QUEUED`.
- **Prevenção de Conflitos por Arquivo**: `getNext()` ignora temporariamente missões cujos `targetFiles` / `lockedFiles` estejam bloqueados por outro worker ativo.
