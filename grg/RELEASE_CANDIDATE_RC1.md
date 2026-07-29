# FÊNIX Ω∞ — RELEASE CANDIDATE RC1

Consolidação dos 9 commits da branch `feature/fenix-living-organism-foundation` numa
Release Candidate. Nenhuma capacidade nova; ARCHITECTURE FREEZE respeitado. Cada número aqui
é medido, não declarado.

## FASE 1 — Release Report (o que muda de v24 → v31)

Diff medido: **35 arquivos, +2993 / -52 linhas.** Componentes novos em relação ao v24 da
produção:

| Componente | Arquivo | Estado |
|---|---|---|
| Connector Contract (12 métodos) | `connectors/connector-contract.js` | ACTIVE |
| Connector Runtime (estado derivado) | `connectors/connector-runtime.js` | ACTIVE |
| GitHub Connector Adapter | `connectors/github-connector-adapter.js` | ACTIVE |
| AI Provider Adapter (genérico) | `connectors/ai-provider-adapter.js` | ACTIVE |
| AI Router (decide) + Gateway delegation (executa) | `ai-runtime/ai-router.js` + `ai-gateway.js` | ACTIVE no fluxo de missão |
| Organism Identity (ligada ao boot) | `kernel/organism-identity.js` | ACTIVE |
| Constituição de Engenharia (10 princípios) | `FENIX_ARCHITECTURE_PRINCIPLES.md` | documento vivo |
| Capability + Reality Matrix | `FENIX_GENOME.md` | documento vivo |
| Schema v24 → v31 | `kernel/state-migrations.js` | migração aditiva |

Coleções novas (v25–v31, todas aditivas): `organismIdentity`, `connectorRegistry`,
`connectorMetrics`, `connectorEvents`, `aiRouterDecisions`.

## FASE 2 — Code Review (encontrou um bug real — o valor de uma RC)

Review independente (subagente) sobre os 7 módulos novos. **1 bug de correção encontrado e
corrigido**, mais 2 ajustes triviais. Nenhum crítico remanescente.

- **CORRIGIDO (anulava a MISSION-1005):** o gateway, com override sem `model`, pareava o
  provider escolhido pelo Router com o `model` da rota default (de OUTRO provider) → o
  provider recebia um modelo que não conhece, falhava e caía no fallback, anulando a decisão
  do Router em silêncio. Os testes não pegaram porque os fakes ignoravam o `model`. Conserto:
  o Router resolve o modelo do PRÓPRIO provider escolhido (`#modelFor`), e o gateway nunca
  pareia com modelo de outro provider. **Regressão trancada por teste novo.**
- **CORRIGIDO (trivial):** `router.invoke()` sem null-check do gateway → agora lança erro claro.
- **CORRIGIDO (trivial):** runtime lia `auth.credential`; adapter de IA devolve em `detail` →
  agora aceita ambos, sem perder evidência.
- **Verificado correto:** nenhuma credencial logada/persistida (só presença medida); router
  só delega ao gateway (sem chamada direta a provider); nenhum `CONNECTED` literal; race de
  boot da identidade resolvida dentro do `store.update`; budget liberado no catch.

## FASE 3 — Teste de carga (medido)

| Cenário | Resultado |
|---|---|
| 50 seleções concorrentes | 50/50 ok, escolha consistente (ollama, local-first), 675 ms |
| 40 invokes concorrentes (router→gateway) | 40/40 ok, 1893 ms |
| Cache (20× mesmo prompt) | 20/20 ok, 1178 ms |
| Failover (local down → fallback) | servido em 19 ms, sem erro |
| Telemetria sob carga | 60 aiCalls = 60 aiRouterDecisions (nada perdido) |

## FASE 4 — Plano de migração

Documentado em `FENIX_MIGRATION_v24_v31.md`. Resumo: migração **aditiva** (nenhum dado
transformado/removido), roda sozinha no boot (`migrateState`), downtime = redeploy dos
containers (segundos), rollback seguro (código v24 ignora coleções novas). **Não executado.**

## Estado da RC1 (medido agora)

- **76/76 arquivos de teste passam**, 0 falhas (~149 s).
- **Auditoria de simulação: 47 módulos, 166 arquivos, 0 simulated, 0 stub, 0 sinais falsos.**
- 0 marcadores de dívida (TODO/FIXME) nos módulos novos.
- 0 dependências não usadas; 0 código morto (todo módulo novo é importado).
- Code review: 0 defeitos remanescentes.

## Known Limitation (medida, aceita conscientemente)

O `chat-agent` ainda usa `this.llm` diretamente (um provider fixo, Ollama), **fora do AI
Router**. Isto foi medido, não esquecido:

- **NÃO é uma segunda arquitetura.** É um único bypass no fluxo de CHAT, não no fluxo de
  missão (que já roteia pelo Router). O runtime de execução continua único — o Gateway.
- **Não compromete o runtime único.** Nenhum provider é executado por dois caminhos; o chat
  usa um provider local para linguagem aberta, comportamento idêntico ao v24.
- **Integração agendada:** MISSION-1008 (CHAT RUNTIME INTEGRATION), primeira tarefa da v32,
  após o deploy do RC1. Objetivo único: eliminar este bypass. Nenhuma outra mudança.

Regra respeitada: nenhuma mudança de escopo durante uma Release Candidate. RC1 =
estabilização; v32 = evolução.

## Documentos de deploy (MISSION-1007A)

`DEPLOY_RC1.md` · `GO_LIVE_CHECKLIST.md` · `ROLLBACK.md` · `PRODUCTION_CHECKLIST.md` — o
caminho completo v24→v31, verificação, reversão e o que separa READY de PRODUCTION_PROVEN.

## Veredito

**RC1 — APROVÁVEL PARA DEPLOY** (READY, não PRODUCTION_PROVEN). O que a RC provou: a
consolidação é sólida, e o processo de RC fez seu trabalho — encontrou e corrigiu um bug que
os testes tinham deixado passar, antes de qualquer promoção.

Somente após aprovação humana desta RC1:
1. **Enterprise Deploy** (v24→v31 na VPS, por `FENIX_MIGRATION_v24_v31.md`).
2. **Executive Brain** (camada de decomposição Programa→Missões — capacidade nova, sai do freeze).
3. **REBORN** (consolidação de conhecimento).

Nada foi commitado além da branch, nada mergeado, nada em produção. A promoção é sua.
