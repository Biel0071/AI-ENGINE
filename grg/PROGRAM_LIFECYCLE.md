# FÊNIX Ω∞ — PROGRAM LIFECYCLE

O ciclo de vida de um Programa. Cada transição é **derivada** do estado das missões, ou
disparada por **aprovação humana** — nunca um status escrito à mão.

## Estados (de `executive-contract.js`)

```
DRAFT ──approve(humano)──► APPROVED ──materializa missões──► RUNNING
  │                                                            │
  │                                              ┌─────────────┼─────────────┐
  └──cancel──► CANCELLED                          ▼             ▼             ▼
                                              BLOCKED      COMPLETED     (segue RUNNING)
                                         (missão travou)  (todas ok)
```

## Regras de transição (medidas, não declaradas)

| De → Para | Gatilho | Fonte da verdade |
|---|---|---|
| (novo) → DRAFT | `decompose` + `createProgram` | Executive Brain propõe; nada materializado |
| DRAFT → APPROVED | **aprovação humana** (`approve`) | nunca automático — o Brain pede, o humano decide |
| APPROVED → RUNNING | 1ª missão materializada via `plan()` | Mission Runtime |
| RUNNING → BLOCKED | alguma missão FAILED/AWAITING sem caminho | `detectBlocks` lê estado das missões |
| BLOCKED → RUNNING | `replan` repropõe + humano reaprova | Executive Brain + humano |
| RUNNING → COMPLETED | todas as missões SUCCEEDED | derivado do Mission Runtime |
| qualquer → CANCELLED | decisão humana | — |

## Invariantes

- **Nenhuma transição positiva sem evidência.** COMPLETED só quando as missões reais
  terminaram; o Brain não pode declarar um Programa completo.
- **Aprovação humana é obrigatória** em DRAFT→APPROVED e BLOCKED→RUNNING (via replan). O
  Brain orquestra e pede; não promove sozinho — mesmo princípio do Gatekeeper.
- **BLOCKED é honesto:** um Programa com missão travada NÃO fica "RUNNING otimista". O
  bloqueio aparece, com a missão nominal.

## Não implementado ainda

A máquina de estados está no contrato (constantes + validador). O motor que a executa
(reconciliar estado das missões → estado do Programa) é missão futura. Hoje: forma travada
por teste, sem execução.
