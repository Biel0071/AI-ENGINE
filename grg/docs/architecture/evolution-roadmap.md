# FÊNIX — Roadmap de Evolução (5 etapas)

> Etapas para chegar ao estado que você pediu: **agente completo, API conectada, ecossistema vivo
> 24/7, memória real ativa.** Cada etapa tem critério de aceite **medível** — a etapa não fecha
> por opinião.
>
> Ordem derivada da medição (`current-system.md`, `missing-features.md`, `technical-debt.md`),
> não da lista de desejos. Regra que vale em todas: nada entra como `CONNECTED`/`HEALTHY`/score
> sem medição por trás.

---

## ETAPA 1 — Discovery ✅ CONCLUÍDA

**Entrega:** os 6 documentos em `docs/architecture/`.

**Resultado medido:** 171 módulos, 143 serviços wired, 143 coleções, 244 rotas, 78 testes.
0 módulos `production`, 13 `simulated` com 193 sinais falsos. Núcleo (missões, kernel, memória,
grafo, fila) **REAL e provado**; 3 lacunas reais (busca web mente, execução sem allowlist,
auto-melhoria inexistente).

**Critério de aceite:** ✅ toda afirmação com evidência de execução; nenhum código alterado.

---

## ETAPA 2 — Master Plan (próxima, sem código)

Você pediu essa etapa intermediária e ela é a certa: com 47 domínios e 40 engines na lista de
desejos, construir sem plano aprovado gera retrabalho garantido.

**Entrega:** `docs/architecture/master-plan.md` com:
1. **Arquitetura alvo** — diagrama de módulos do estado futuro.
2. **Reuso vs novo** — para cada item do PROMPT 02, dizer: já existe (qual serviço), existe e
   precisa virar real, ou não existe. A medição da Etapa 1 já dá 90% disso.
3. **Decisão sobre as 8 camadas simuladas** — tornar real ou remover. Precisa de decisão sua:
   são 187 sinais falsos e ~32 arquivos.
4. **Plano de migração** do estado atual ao alvo, por fase.
5. **Ordem exata de implementação** com dependências.
6. **Critérios de aceite por fase** (medíveis).
7. **Estratégia de rollback** por fase.
8. **Riscos técnicos e mitigação.**

**Critério de aceite:** plano aprovado por você antes de qualquer linha de código.

**Decisões que só você pode tomar** (vão para o plano como pergunta):
- as 8 camadas cognitivas simuladas: tornar reais ou remover?
- busca web: fonte externa real (qual allowlist de domínios) ou devolver `unknown`?
- auto-melhoria: PR automático em branch é aceitável, ou só proposta para revisão humana?

---

## ETAPA 3 — Núcleo real (código)

O que hoje impede "agente completo". Escopo fechado, cada item com teste.

| # | Trabalho | Estado hoje | Critério de aceite |
|---|---|---|---|
| 3.1 | **Busca web honesta** | fabrica 2 resultados para termo inexistente | termo inexistente → 0 resultados ou `unknown`; termo real → resultado com URL verificável. Teste com o discriminador `zzqx-…` |
| 3.2 | **Execução de comando** | allowlist com 0 scripts | ≥3 scripts assinados registrados; `sandbox.execute` roda um e devolve saída real; não autorizado continua recusado |
| 3.3 | **Tool registry** | 0 tools | ferramentas registradas e invocáveis por agente, com resultado medido |
| 3.4 | **Agentes cognitivos instanciados** | 0 no store, `cycle()` falha | `agentEcosystem.cycle()` completa; task criada, roteada e concluída com trilha |
| 3.5 | **Memória ativa no loop** | REAL mas passiva | toda missão concluída grava memória; chat consulta memória antes de responder; provado com pergunta que só a memória responde |
| 3.6 | **Destravar a suíte** | 5 falhas em `main` | 78/78 passando, ou falha justificada por escrito |
| 3.7 | **Remover `app.queues` órfão** | objeto vazio que promete | ausente ou apontando para `app.jobs` |

**Rollback:** cada item é commit isolado; `FENIX_VERSION` anterior comentado no `.env.production`.

---

## ETAPA 4 — Ecossistema (código)

Só o que a Etapa 1 provou ausente **e** o Master Plan aprovar. Não os 40 engines — os que faltam.

| # | Trabalho | Critério de aceite |
|---|---|---|
| 4.1 | **Auto-melhoria: branch → commit → push → PR** | o FÊNIX abre um PR real no próprio repo, gerado por ele, com diff válido. Este é o marco de auto-evolução |
| 4.2 | **Harvesters reais** (doc/OpenAPI/paper, conforme o plano) | absorve uma fonte real e gera entidade + relação no grafo, verificável |
| 4.3 | **Sink externo de histórico** | `auditEvents`/`domainEvents` saem do documento; retenção cai; `update()` mais rápido, medido |
| 4.4 | **Decisão das 8 camadas executada** | `simulationAudit` → 0 sinais falsos, ou os módulos removidos |
| 4.5 | **Um motor de laço só** (D10) | `livingRuntime` promovido ou removido; não dois |

**Rollback:** 4.3 e 4.4 mexem em estrutura — backup de `pg_dump` antes, rollback documentado.

---

## ETAPA 5 — Go-live 24/7 (código + operação)

Deixar rodando, com prova de que continua rodando.

| # | Trabalho | Critério de aceite |
|---|---|---|
| 5.1 | **Loops permanentes ativos** | ciclo de missão, schedules, reconcile, manutenção idle e research rodando; medido por 24 h contínuas |
| 5.2 | **Observabilidade acionável** | alerta quando worker para, fila cresce ou documento passa do teto; `/health` reflete cada um |
| 5.3 | **Prova de operação contínua** | janela de 24 h com: 0 erro de worker, 0 conflito 40001, N missões concluídas sozinhas, documento estável |
| 5.4 | **Front funcional** | comando pela UI → missão → conclusão, visível no painel; mobile e desktop verificados |
| 5.5 | **Memória real ativa permanente** | memória acumulando entre sessões e influenciando resposta, provado com pergunta cuja resposta só existe na memória |
| 5.6 | **Runbook** | como subir, parar, rollback, diagnosticar; escrito a partir do que foi realmente executado |

**Critério de aceite da etapa (e do projeto):** você dá um comando no FÊNIX pela UI, ele orquestra
até o fim sozinho, respeitando aprovação RED, com memória viva — e isso permanece verdadeiro
depois de 24 h sem intervenção.

---

## O que já está pronto para 5.x hoje

Medido em produção nesta sessão (rc.14 → rc.18), útil como linha de base:

- worker rodando com lease de líder, reconciliação de missão e scheduler (`FENIX_MISSION_AUTOSTART=1`, teto 2);
- missão `PLANNED → SUCCEEDED` em **16 s** sem intervenção externa;
- passo RED parando em `AWAITING_APPROVAL` com `approvalId`, `jobId: null`;
- janela limpa de 7 min: **0 erro de worker, 0 conflito 40001**;
- documento 5,4 MB → 607 kB; `update()` ~900 ms → ~430 ms;
- `https://fenix.209-50-241-22.sslip.io/health` → 200 com todos os checks derivados verdes.

Falta, para 24/7 de verdade: janela de 24 h medida (não 7 min), alerta acionável, e as três
lacunas da Etapa 3.

---

## Fora de escopo (declarado)

- **Kubernetes** — 1 VPS não justifica; Compose atende e tem rollback de uma linha.
- **Mobile/Flutter nativo** — não existe base; entra só se você pedir explicitamente.
- **Separar o documento único em tabelas** — a correção definitiva de D1, porém é reescrita do
  kernel com migração de schema. Só com decisão sua, em etapa própria.
- **Rotação de credenciais** (senha root da VPS exposta, chaves da AI Platform) — é ação sua no
  provedor/registrador, não código.
- **DNS de `fenix.grgservices.com.br`** — NXDOMAIN; apontar é ação no registrador.
