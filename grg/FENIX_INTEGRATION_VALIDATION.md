# FÊNIX Ω∞ — VALIDAÇÃO DE INTEGRAÇÃO (MISSION-1004)

Validação ponta a ponta do que foi construído (MISSIONs 0003–1003). Não adiciona
capacidade; mede o fluxo real e reporta o que funciona e onde a integração está solta.
Coberto por `test/integration-validation.test.js` (5 testes, todos verdes).

## FASE 1 — Fluxo de missão, elo por elo (medido)

| Elo | Estado | Evidência |
|---|---|---|
| Usuário → Mission Runtime | **FUNCIONA** | `missionPlanner.plan()` compila e materializa missão governada |
| Mission Runtime → passos governados | **FUNCIONA** | catálogo governado (`mission-kernel`), DAG validado |
| AI Router → provider por evidência | **FUNCIONA (isolado)** | `aiRouter.route()` seleciona por saúde+política, invoca provider real |
| Provider → resposta | **FUNCIONA** | provider real produz texto; telemetria medida |
| Missão → Knowledge/DNA | **FUNCIONA** | `missionArtifacts.reuseReport()` mede playbooks/planos |
| Estado → Dashboard | **FUNCIONA** | `/api/connectors` deriva estado; AI providers aparecem como conectores |

## FASE 3 — O GARGALO / ELO SOLTO (o achado central)

**O Mission Runtime NÃO consome o AI Router.** Medido por leitura de código:
- `mission-planner.js` não referencia `aiRouter` nem `aiGateway` (0 ocorrências).
- `chat-agent.js` usa `this.llm` direto — um provider fixo, não o router.
- Cinco módulos chamam `aiGateway.invoke` diretamente (`model-orchestrator`,
  `keos/universal-adapters`, `omega/collective-intelligence`, `software-factory`).
- **Ninguém chama `aiRouter`.** Ele está instanciado no app, testado (6/6), mas é uma ilha.

Isto não é um bug do router — é integração incompleta. A MISSION-1003 construiu o
componente e provou que funciona isolado, mas não o inseriu no caminho de missão. O fluxo
que a visão descreve (Mission → AI Router → provider escolhido → síntese) **existe em
peças, não conectado de ponta a ponta.**

Outros pontos medidos (sem gargalo):
- Sem chamadas duplicadas ao gateway detectadas nos módulos lidos.
- Cache exato antes do modelo já existe (MISSION-0002), reduz chamadas repetidas.
- Circuit breaker e fallback já no gateway; o router adiciona seleção, não os substitui.

## FASE 4 — Correções

Nenhuma feita: a missão proíbe adicionar funcionalidade ou alterar arquitetura, e o único
achado (router solto) é justamente uma **mudança de arquitetura** (ligar o router ao
planner). Corrigir aqui violaria o escopo. Fica registrado como o próximo trabalho.

## FASE 5 — Relatório

**O que funcionou:** cada componente isolado faz o que promete e é medido — planner
materializa, router seleciona por evidência e invoca, artefatos registram reuso, dashboard
deriva estado. Nenhum valor fabricado; 0 sinais falsos.

**O que falhou:** nada quebrou. O que está **incompleto** é a costura: o AI Router não está
no caminho de missão. Hoje a IA de missão passa pelo `aiGateway` direto (rotas fixas), não
pelo router de seleção por evidência.

**Gargalo:** o elo solto acima. Enquanto o planner não rotear pelo AI Router, a política
local→grátis→pago e o registro de decisão (`aiRouterDecisions`) não são exercitados por
missões reais — só por chamada direta ao router.

**Melhoria necessária (próxima missão, não esta):** inserir o AI Router entre o Mission
Runtime e os providers, substituindo as chamadas diretas a `aiGateway.invoke` por
`aiRouter.route` onde fizer sentido. É uma mudança de arquitetura pequena e localizada, mas
é mudança — exige sua decisão explícita, fora do escopo de validação.

## ATUALIZAÇÃO — MISSION-1005 fechou o elo

O elo solto foi fechado. Arquitetura decidida: **Router decide, Gateway executa** — um
runtime só, um ponto de observabilidade.

- `aiGateway.invoke` ganhou `provider`/`model` opcionais (retrocompatível: sem eles,
  comportamento idêntico; teste enterprise segue verde). `candidates()` põe o provider
  escolhido primeiro e a rota configurada como fallback.
- `aiRouter` ganhou `invoke()` com a MESMA assinatura do gateway (drop-in) e o `route()`
  agora DELEGA ao gateway em vez de chamar o provider direto.
- `SoftwareFactory` (o ponto real de IA da missão, `factory.plan → this.ai.invoke`) passou
  a receber o Router. Zero mudança no call site.
- **Telemetria preservada, provado por teste**: uma execução de missão grava em `aiCalls`
  (gateway continua o executor) E em `aiRouterDecisions` (router registra a decisão). O
  speed-score e a observabilidade não perdem nada.

Restam, agora com o orquestrador de fato no fluxo:
1. **Enterprise Deploy** (v24→v31 na VPS) — leva tudo à produção.
2. **Learning Router** — o sinal de qualidade, que agora terá dados reais (`aiRouterDecisions`).
3. **Router por tipo de missão** — o terceiro fator (architecture→claude, embeddings→ollama)
   que o dono sugeriu; hoje o router decide por saúde+tier, não por tipo.
