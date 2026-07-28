# FÊNIX Ω∞ — PLANO DE EVOLUÇÃO

Baseado no código real (ver `FENIX_SYSTEM_AUDIT.md`), não em aspiração. A ordem respeita a
regra final do próprio dono do projeto: **toda melhoria em branch própria, validada,
documentada, por pull request, e só então produção conforme a política de deploy.** Nada
aqui é commitado, tagueado ou implantado sem autorização explícita.

## Revisão de estratégia (MISSION-0002)

A auditoria da MISSION-0002 provou que dois dos três alvos de consolidação **não eram
duplicação**: Event Bus (3 camadas corretas) e Registries (5 domínios distintos). Ver
`FENIX_COMPONENT_RELATIONSHIP.md`. A estratégia foi corrigida e elevada a princípio
permanente em `FENIX_ARCHITECTURE_PRINCIPLES.md`:

- **NÃO fundir** camadas ou domínios distintos — só duplicação real comprovada.
- **Ordem fixa**: cobertura de testes → validação → consolidação por evidência.
- **Única duplicação real**: as 8 superfícies cognitivas (35 arquivos sem teste), a serem
  consolidadas **somente após** o Sprint A.

## Princípio que ordena tudo

O repositório está **maduro e honesto** (0 simulações, 0 sinais falsos, 69/69 testes). O
problema não é falta de motor — é **duplicação sem cobertura** (35 arquivos cognitivos sem
teste) e **falta do instrumento que prova maturidade**. Portanto: cobrir antes de
consolidar, medir antes de expandir, uma entrega por branch.

## Mapeamento dos 12 comandos → realidade

| Comando | Pedido | Situação real | Ação correta |
|---|---|---|---|
| 01 Auditoria | mapear + 3 relatórios | — | **FEITO** (estes 3 arquivos) |
| 02 Organismo | criar 8 motores | 6 dos 8 já existem | consolidar + cobrir, não criar |
| 03 Memória | 9 tipos de memória | `memory-engine` + `knowledge-genome` existem | estender vocabulário, não recriar |
| 04 Visão | Vision Engine | **não existe** | novo, multi-sprint, precisa de decisão |
| 05 Skills | 6 registries | Skill/Capability existem; DNA/Benchmark comparativo não | fechar o que falta (sem runner de benchmark, não há antes/depois) |
| 06 Research | Living Research | `research/` existe, off por padrão, allowlist | já entregue; expandir fontes |
| 07 Builder | construir tudo (Android/iOS/jogos) | `software-factory` + `onedeploy` parciais | **meses de trabalho**, não um commit |
| 08 Orquestração | Mission Orchestrator | `mission-planner` + `orchestrator` existem | já entregue |
| 09 DNA | DNA Cognitivo | parcial em `omega-infinity/cognitive-dna-compiler` | precisa de execução comparativa que não existe |
| 10 Meta Brain | observar + gerar missões | `continuous-improvement-loop` + loops fazem isso | já entregue; nomear como capacidade |
| 11 Runtime | Living Runtime | **existe** (11 loops) | nada a criar |
| 12 Deploy | deploy VPS + tag + push | runbook existe; **eu não toco produção** | usuário executa (decisão anterior) |

## Roadmap executável (relação valor/risco)

### Sprint A — Rede de segurança (pré-requisito de tudo)
Cobrir com teste as 8 superfícies cognitivas sem cobertura (35 arquivos). Sem isto,
consolidar é operar no escuro. Entregável: novos `test/*.test.js`, cada superfície com ao
menos o caminho feliz e um caminho de erro exercitados.

### Sprint B — Fechar a Fase 2 (identidade)
Ligar `organism-identity.js` ao `app.js`, persistir no schema (v29), registrar geração no
boot, expor `GET /api/organism/identity`. Pequeno, reversível, alto valor simbólico:
completa o único organo que faltava.

### Sprint C — Capability Contract por níveis
`capability-levels.js` + `definition-of-life.js` + `release-contract.js`. Torna maturidade
**medida** em vez de declarada. O primeiro relatório lerá `knowledge.reuse` LEVEL 0 de 10 e
`dashboard.live.events` LEVEL 1 de 4 — números baixos e verdadeiros. É o instrumento que
prova o diferencial "sobrevive à troca de modelo".

### Sprint D — CI mínimo
`.github/workflows/test.yml` rodando `node --test` em push. O gate que os comandos 01 e 12
assumem existir e não existe.

### Sprint E — Consolidação cognitiva (maior ganho, maior risco)
Só depois de A. Fundir as 8 superfícies no que sobrevive por medição. Reduz ~35 arquivos.
Refactor grande; cada fusão em sua branch, com a suíte verde antes e depois.

### Fora deste horizonte (precisam de decisão e recursos do dono)
- **Vision Engine** (Comando 04): novo, grande, precisa de definição de escopo.
- **Universal Builder Android/iOS/jogos** (Comando 07): meses; hoje só web parcial.
- **OAuth de saída + conectores Meta/Google**: exige credenciais reais e autorização de
  tráfego de saída; toca as regras de credencial em vigor.
- **Deploy em produção** (Comando 12): decisão do dono — "Construir o caminho, você executa".

## Política de execução (a regra final, operacionalizada)

1. Uma entrega por branch (`feat/`, `fix/`, `test/`).
2. `node --test test/` verde antes de abrir PR.
3. Documentação e testes na mesma branch da mudança.
4. `simulation-audit` com 0 sinais falsos como gate.
5. Merge por PR; produção só por autorização humana sobre evidência medida.
6. O FÊNIX nunca é "concluído" — é um SO cognitivo em evolução contínua.
