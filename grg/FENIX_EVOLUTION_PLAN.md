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

## Checkpoint de realidade — ciclo 22/10/2026

Este checkpoint atualiza o roadmap com evidências atuais sem substituir as decisões de arquitetura acima. A matriz, o scorecard e o log do ciclo têm os detalhes e critérios de verificação.

- O checkout está na branch `fenix/operational-os-20260924`, commit `bb57b6a`; havia 495 entradas modificadas/untracked na abertura deste ciclo. Alterações preexistentes foram preservadas e produção não foi alterada.
- A versão servida em `209.50.241.22:3000` responde `v2.5.0`, mas os hashes de `index.html`, `fenix-world-ui.js` e `city-runtime-composition.css` diferem dos arquivos locais. Tratar VPS e checkout como versões distintas até parear build/commit e assets.
- Primeiro ciclo local: corrigida a expectativa antiga do teste de primeira pintura para exigir as duas folhas CSS versionadas; testes de geometria HUD, métricas, Screen DNA, Flow Graph e absorção passaram. O bug reportado de sobreposição foi observado na VPS, mas não reproduzido na fixture local — manter aberto até validar o layout real local.
- Pattern Library agora registra padrão sem validação como `CANDIDATE/UNASSESSED`; `PROVEN` requer evidência `VERIFIED`, IDs de teste e timestamp; `CORE` também requer aprovação. O Token Economy só reutiliza padrões que passam esse contrato.
- Screen Reconstruction não usa Screen DNA absorvido no modo cold. Durações são observadas, mas tokens/economia e chamadas evitadas ficam não medidos quando faltam dados de provider. O CEO descreve esses valores como estimativas e não como economia real.
- Ciclo 2 removeu baseline estático, economia mínima de 52%, score mínimo 50 e estimativa fixa de 450 tokens por cache hit. A API e o CEO agora distinguem `UNMEASURED` de estimativas internas; 33 testes direcionados passaram. O E2E HTTP permanece pendente porque esta sessão local não tinha autenticação e recebeu 401.
- Próxima prioridade: estabelecer uma baseline de execução local autenticada e reproduzir o P0 de inicialização/versão; em paralelo, auditar a semântica e a proveniência dos 60 registros `operational.activation` observados em Work. Não publicar sem pareamento e autorização.

Artefatos do checkpoint: `FENIX_SYSTEM_REALITY_MATRIX.md`, `FENIX_PATTERN_LIBRARY_INDEX.md`, `FENIX_EVOLUTION_SCORECARD.md`, `FENIX_CONTINUOUS_RUN_LOG.md` e auditoria de mídia já referenciada no backlog visual.

## Checkpoint contínuo — 23/10/2026 UTC

A leitura do META MASTER preserva o escopo inteiro. Documentos canônicos equivalentes já existem; não criar `FENIX_CONTINUOUS_EVOLUTION_PLAN.md` duplicado. A verificação local/VPS atualizou o P0 AUD-001: HEAD conhecido, porém worktree com 520 caminhos modificados e apenas 1/5 hashes de assets críticos igual. `memory-live.js` foi publicado isoladamente com backup/rollback e grafo autenticado 2.828/2.828; não inferir que o restante do produto acompanha o checkout.

Sequência prioritária: (1) exercitar rollback em sandbox isolado; (2) selecionar release pequena e coesa com manifest/build ID reproduzível; (3) provar Cidade e IDE na versão candidata antes de novo deploy; (4) retomar o próximo P0 do backlog. Não sincronizar o worktree inteiro enquanto as mudanças concorrentes não estiverem agrupadas e verificadas.

Atualização de checkpoint: o overlay atual agora está identificável por `GET /release-manifest.json`, com 9 hashes e declaração explícita de origem parcial. O rollback do hotfix de memória foi exercitado em cópia temporária. Isto reduz risco operacional e melhora observabilidade de release, mas não resolve a divergência do frontend completo nem cria release reproduzível. AUD-001 permanece aberto.

Checkpoint aditivo 23/10/2026 UTC: o estado inicial do minimapa agora separa CONNECTING de falha de telemetria; teste reproduziu antes da correção, 14 testes Cidade passaram, asset foi aplicado como patch pontual com backup e rollback sandbox. Browser pós-reload observou dados reais. Manter UI-024 aberto para a jornada de autenticação completa e AUD-001 aberto para release reproduzível do shell inteiro.

Checkpoint aditivo 23/10/2026 UTC — Memory Brain: publicado renderer WebGL em canvas isolado e amostragem menos radial. Dados autenticados reais carregam 2.828 nós/13.528 registros; tela atual mostra orçamento de 700 nós e 45 arestas para FÊNIX OS. UI-193 segue FIXED, aguardando verificação visual 375/768/1280/1920 e comparação funcional com o vídeo. Continuar a missão sem sincronizar o worktree inteiro; AUD-001 segue aberto.

Checkpoint 23/10/2026 UTC — Memory Brain phase9: seleção de entidades agora segue relações verdadeiras e limita o foco a 8 spokes; browser VPS mostra 40/45 relações visuais contextuais com FÊNIX OS selecionado. 19 testes focados passaram e backup foi exercitado em sandbox. Próximo: medir rotação/zoom/seleção e capturar dimensões 375/768/1280/1920 antes de alterar o estado UI-193; manter AUD-001 aberto.
