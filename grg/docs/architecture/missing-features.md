# FÊNIX — O que falta (medido)

> Este documento responde à pergunta que importa: **o que NÃO existe** vs **o que existe e está
> desligado**. São trabalhos completamente diferentes. Classificação por execução, não por
> leitura de código.

## Categorias

- **DESLIGADO** — o código existe e funciona; falta configuração/dado. Trabalho de operação, minutos.
- **SCAFFOLD** — a estrutura existe, o miolo não faz o trabalho. Trabalho de implementação, horas.
- **MENTE** — devolve resultado fabricado. **Pior que ausente**, porque quem consome acredita.
- **NÃO EXISTE** — não há código. Trabalho de construção.

---

## MENTE (prioridade máxima — remover ou tornar real)

### 1. Busca web — `src/cognitive/external-search.js`
**Medido:** `externalSearch.search('zzqx-termo-que-nao-existe-9271')` devolveu **2 resultados**.
Não há chamada HTTP; os resultados são template de URL com `reliability: 0.98` fixo.

É a única capacidade do sistema que **mente ativamente**. Um agente que "pesquisa" e recebe
ficção produz decisão baseada em ficção. Duas saídas honestas:
- (a) remover e devolver `unknown('sem fonte externa configurada')`;
- (b) ligar em fonte real via `researchSource` (que já tem allowlist, cache e TTL).

A opção (b) é a certa: `researchSource` já existe e é governado.

---

## DESLIGADO (existe, falta dado/config)

### 2. Execução de comando — allowlist vazia
**Medido:** `scriptDefinitions` = **0**. `scripts.register` existe, `sandbox.execute` recusa
corretamente (`authorized script not found`). O mecanismo está certo — a allowlist nunca foi
populada. Ligar = registrar scripts assinados.

### 3. Tool registry vazio
**Medido:** `tools.list()` = **0**. `tools.register` existe. Sem ferramenta registrada, o agente
não tem o que invocar.

### 4. Agentes cognitivos sem instância
**Medido:** 15 especialistas no `agentSwarm`, mas `cognitiveAgents` = **0** no store, e
`agentEcosystem.cycle()` falha com `cognitive agent not found: undefined`. O ecossistema espera
agentes registrados que ninguém registra no bootstrap.

### 5. Research loop desligado por padrão
Correto por design (allowlist + off por padrão), mas hoje significa que o FÊNIX não aprende de
fora. Ligar exige decidir a allowlist de domínios.

### 6. LLM sem chave em ambiente local
`app.llm` é `null` sem chave — comportamento **correto** (não fabrica). Em produção o gateway
está wired. Não é lacuna: é a fronteira funcionando.

---

## SCAFFOLD (estrutura sem miolo)

### 7. As 8 camadas cognitivas superiores
`omega-infinity` (33 sinais), `omega` (30), `keos` (18), `performance` (9), `uios` (9),
`nexus` (8), `scos` (7), `workspace` (5), `plugins` (4).

Todas devolvem score/veredito/confiança **escritos à mão**. São 138 sinais falsos em 32
arquivos. Cada método aqui é uma promessa de inteligência sem medição por trás.

Decisão a tomar (vai para o Master Plan): **tornar real ou remover**. Manter simulado é a única
opção proibida pela regra REALITY FIRST do próprio projeto.

### 8. `onedeploy` — 26 sinais
Pipeline de deploy com resultado hardcoded. O deploy real acontece por `docker compose` + scripts
em `ops/`, não por este módulo.

### 9. `operations` — 19 sinais
Ironia medida: é o módulo que **mede a saúde do sistema** e tem 19 sinais falsos. Parte dos
checks é real (probes de componente com latência medida); parte devolve veredito fixo.

---

## NÃO EXISTE

### 10. Auto-melhoria (o loop que fecha o ciclo)
Não há gerador de diff nem aplicador. O FÊNIX consegue **planejar** melhoria
(`evolutionProposals`, `improvementScans`) mas não consegue **escrever código e abrir PR** por
conta própria. `githubOps.createPullRequest` existe e é real — falta o que vai dentro do PR.

Este é o marco de auto-evolução: branch → commit → push → PR pelo próprio runtime.

### 11. Sink externo de log/histórico
Hoje **o histórico mora no documento de estado**, e por isso encarece toda escrita do sistema.
Falta um destino externo (arquivo, Loki, S3) para `auditEvents`/`domainEvents`, permitindo baixar
a retenção sem perder trilha.

### 12. Tracing distribuído e alertas
Há `/health`, Prometheus e métricas. Não há trace por requisição nem alerta acionável.

### 13. Frontend de verdade
`public/index.html` = 7117 bytes, página única, sem framework/rotas/design system/store.
Não existe: mobile responsivo verificado, componentes reutilizáveis, estado do cliente.

### 14. Mobile / Flutter
Não existe no repo, apesar de `agent-frontend`/Flutter Agent aparecerem no roster.

### 15. Kubernetes
Só Compose. Não é lacuna real hoje (1 VPS), mas está na lista de intenção.

### 16. CLI e SDK
Não existem. Toda operação é HTTP ou `docker exec`.

### 17. Sistema de plugins funcional
`pluginSkills` tem 4 sinais falsos; `installPlugin` não instala nada verificável.

---

## Harvesters do PROMPT 02 — estado medido

| Harvester pedido | Existe? | O que há de real |
|---|---|---|
| GitHub Harvester | **parcial** | `repoIntel.connect/analyze` faz clone real com `fileCount`/`revision`; `githubOps` cria PR/issue de verdade |
| Documentation Harvester | **não** | — |
| Paper Harvester | **não** | — |
| API Harvester (Swagger/OpenAPI) | **não** | — |
| Benchmark Engine | **parcial** | `missionBenchmarks` existe como coleção; sem motor de benchmark |
| Multimodal (PDF/vídeo/ZIP/APK) | **scaffold** | `multimodalPipeline.processFile/extractData` existe; não medido com arquivo real |

---

## Resumo executivo

| Situação | Itens | Esforço |
|---|---|---|
| MENTE | 1 (busca web) | horas — é a mais urgente |
| DESLIGADO | 5 | minutos a horas (config/dado) |
| SCAFFOLD | 3 grupos (~40 módulos) | decisão de escopo antes de esforço |
| NÃO EXISTE | 8 | dias a semanas |

**A leitura que importa:** o FÊNIX não precisa dos 40 engines do PROMPT 02 — a maioria já existe
como código wired. Precisa que **os que existem parem de fingir** e que **três lacunas reais**
(busca, execução, auto-melhoria) sejam fechadas. É isso que separa "sistema grande" de "agente
completo".
