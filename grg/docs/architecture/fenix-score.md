# FÊNIX SCORE — 62/100

> Medido em 2026-07-29 (rc.18). Cada nota tem a evidência que a sustenta. Nota alta exige
> **medição**, não existência de código — é a mesma regra que o `simulationAudit` do projeto
> aplica.
>
> Método de nota: 0–20 não existe / não funciona · 21–40 existe e não é confiável · 41–60
> funciona com lacuna conhecida · 61–80 funciona e é medido · 81–100 funciona, é medido e
> resiste a falha.

## Placar

| Dimensão | Nota | Peso | Base da nota |
|---|---:|---:|---|
| Arquitetura | 70 | 10 | 47 domínios coesos, 143 serviços wired, contratos claros. Teto: documento único de estado |
| Código | 65 | 8 | 16,5k linhas, comentários que explicam *por quê* com medição. Teto: 193 sinais falsos |
| Escalabilidade | **35** | 10 | `update()` de 430 ms num doc de 607 kB; 8 escritas por evento. Não escala além de 1 tenant ativo |
| IA | 60 | 9 | Gateway real com breaker/budget/roteamento por evidência; `llm` null sem chave (honesto). Teto: busca web fabrica |
| Memória | **80** | 9 | `remember`+`query`+`history` medidos; versionada, com escopo, provenance e TTL |
| Knowledge | 55 | 7 | Grafo real; sem harvester de documentação/paper/OpenAPI |
| Graph | **80** | 6 | `upsertEntity`+`relate`+`shortestPath` provados; `impact`, `anomalies`, `neighborhood` |
| Agentes | **45** | 8 | 15 especialistas registrados, mas 0 agentes cognitivos no store e `cycle()` falha |
| Scheduler | **75** | 8 | Provado: missão `PLANNED→SUCCEEDED` em 16 s sozinha, teto de concorrência, RED respeitado |
| Segurança | **80** | 9 | OIDC-only em produção, secrets por arquivo, `assertNoSecrets`, auditoria encadeada, containers read-only |
| Deploy | 70 | 7 | Compose de 8 serviços, rollback em 1 linha, import-closure antes de build. Teto: allowlist de env foi armadilha silenciosa |
| Observabilidade | 50 | 7 | `/health` derivado + Prometheus + heartbeats. Sem tracing nem alerta acionável |
| Performance | **40** | 7 | Melhorou 2× nesta sessão e medido; ainda limitado pelo item estrutural |
| Documentação | 45 | 5 | 144 markdowns, nenhum com data de medição; `docs/architecture/` só existe a partir de agora |
| Qualidade | **55** | 8 | 78 arquivos de teste, 73 passam, **5 falham em `main`**; testes novos verificados por mutação |

**Média ponderada: 62/100**

---

## Por que 62 e não mais

**O que puxa para cima (medido, não afirmado):**

O núcleo funciona de verdade. A prova mais forte é ponta a ponta: missão criada `PLANNED`,
iniciada/despachada/executada/finalizada **pelo próprio sistema** em 16 s, com trilha completa
(`mission.created → started → step.dispatched → step.completed → completed`) e job real
`discovery.scan SUCCEEDED`. Nenhuma chamada externa de `start()` ou `runBatch()`.

E a governança não cedeu para conseguir isso: passo RED (`generate`) parou em
`AWAITING_APPROVAL` com `approvalId` presente e `jobId: null`. Um scheduler autônomo que
respeita aprovação humana vale mais que um que "consegue tudo".

Segurança e memória são as duas dimensões mais sólidas. Memória grava, consulta, versiona e
guarda provenance — testado. Segurança tem OIDC-only em produção, secrets fora do store por
verificação ativa e trilha encadeada com `verify()`.

**O que puxa para baixo (três coisas, honestamente):**

1. **Escalabilidade 35 — teto estrutural.** O estado é um documento único reserializado a cada
   escrita sob SERIALIZABLE. Um evento publicado custa **8 escritas**. Medi 61 escritas/min só da
   API saturando o store, com jobs morrendo por não conseguir escrever. Reduzi o documento de
   5,4 MB para 607 kB e o `update()` de ~900 ms para ~430 ms — isso comprou folga, não removeu o
   teto. Com dois tenants ativos o problema volta.

2. **193 sinais falsos.** O auditor do próprio projeto classifica **0 módulos como `production`** e
   13 como `simulated`. As camadas cognitivas de cima (`omega`, `omega-infinity`, `keos`, `uios`,
   `scos`, `nexus`, `performance`) devolvem score, veredito e confiança **escritos à mão**. Não é
   opinião minha: é a ferramenta que o projeto construiu para pegar exatamente isso, e ela está
   apontando.

3. **A busca web mente.** `search('zzqx-termo-que-nao-existe-9271')` devolveu 2 resultados, sem
   nenhuma chamada HTTP. É a única capacidade que produz ficção com aparência de fato — pior que
   uma capacidade ausente, porque quem consome acredita.

---

## Notas que discordam da percepção comum

**Agentes 45, não 80.** Há 15 especialistas com papéis bem definidos (architect, backend,
frontend, ux, qa, devops, db, security, docs, obs, ai, memory, knowledge, twin, planner) e isso
parece um sistema multiagente pronto. Mas `cognitiveAgents` no store = **0**, e
`agentEcosystem.cycle()` falha com `cognitive agent not found: undefined`. Roster registrado não é
agente operando.

**Performance 40 apesar da melhoria de 2×.** Melhorar o dobro e medir é bom; continuar com
`update()` em centenas de milissegundos por escrita, num sistema que escreve 8 vezes por evento,
não é nota alta. A melhoria foi real; o patamar ainda não é.

**Documentação 45 com 144 markdowns.** Volume não é nota. Nenhum dos documentos existentes tem
data de medição ou verificação por teste, e foi documentação desatualizada que fez o FÊNIX dizer
na UI que "não possuía capacidades avançadas" — enquanto tinha 9 capacidades registradas. Os 6
documentos deste Discovery são os primeiros com evidência colada.

**Qualidade 55 com 78 arquivos de teste.** Cinco falham em `main`. Uma suíte que já falha
normaliza falha, e regressão nova se esconde no ruído. Os testes que escrevi nesta sessão foram
verificados por **mutação** (revertendo o código, o teste falha) — sem isso, "passa" não prova nada.

---

## Caminho para 80+

| Ação | Efeito estimado |
|---|---|
| Busca web honesta (Etapa 3.1) | IA 60→70; remove a única mentira ativa |
| Suíte 78/78 (3.6) | Qualidade 55→75; regressão volta a ser visível |
| Agentes cognitivos operando (3.4) | Agentes 45→70 |
| Sink externo + tabelas separadas (4.3) | Escalabilidade 35→65, Performance 40→70 |
| Decidir as 8 camadas simuladas (4.4) | Código 65→80; auditor a 0 sinais |
| 24 h medidas + alertas (5.1–5.3) | Observabilidade 50→75 |

Com Etapas 3 a 5 concluídas segundo os critérios de aceite escritos, o score projetado é **~82**.
Passar de 90 exige a correção estrutural do documento único — reescrita de kernel, etapa própria,
decisão sua.

---

## Uma frase

O FÊNIX é um sistema **grande, wired e com núcleo genuinamente funcional** — ele já leva um comando
ao fim sozinho, respeitando governança. O que o separa de "agente completo" não são os 40 engines
da lista de desejos: são **três lacunas reais** e **um teto de escrita** — e o fato de que as
camadas mais impressionantes do sistema ainda são as que menos medem.
