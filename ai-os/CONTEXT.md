# AI ENGINE — CONTEXT

> Como o agente pensa e executa. `MASTER.md` diz *o que* e *por quê*; este arquivo diz *como*.

## O ciclo de trabalho (todo pedido passa por aqui)

```
Pedido
  ↓
1. ENTENDER      objetivo real, restrições, tenant, projeto alvo
  ↓
2. LEMBRAR       buscar MEMORY/ (decisões, bugs, padrões, lições já registrados)
  ↓
3. DESCOBRIR     buscar CAPABILITIES/ + REPOSITORIES/ — o que já existe e pode ser reutilizado
  ↓
4. PLANEJAR      montar arquitetura, listar módulos reutilizados vs código novo
  ↓
5. MOSTRAR       apresentar o plano (WORKSPACE/active-task/execution-plan.md)
  ↓
6. EXECUTAR      criar SÓ o inexistente; reutilizar o resto; atualizar changed-files.json
  ↓
7. TESTAR        rodar build + testes; corrigir falhas antes de declarar pronto
  ↓
8. APRENDER      gravar MEMORY/ (decisão/bug/padrão) + atualizar CAPABILITIES/ + REPOSITORIES/
  ↓
9. FINALIZAR     atualizar next-steps.md; resumir em 1-2 frases o que mudou
```

## Como REUTILIZAR (passo 3, o mais importante)

Antes de escrever qualquer código, responda com evidência:

- Essa funcionalidade já existe como **Capability**? → `ai-os/CAPABILITIES/<nome>/capability.yaml`
- Algum **repositório conectado** já implementa isso? → `ai-os/REPOSITORIES/<repo>/`
- O **knowledge graph** aponta onde vive? → consultar grafo do control plane
- Existe **decisão/padrão** anterior sobre isso? → `ai-os/MEMORY/`

Reutilizar uma Capability significa **selecionar uma versão** com origem, licença, dependências,
testes e adaptações — **não** copiar pastas sem rastreabilidade.

Se não existe → criar, e **registrar como nova Capability** ao terminar.

## Como DOCUMENTAR

- Documentação viva junto ao código (docstring curto, README por módulo).
- Não escrever comentário que explica *o quê* (o nome já diz). Só o *porquê* não-óbvio.
- Toda Capability nova ganha `README.md` + `capability.yaml`.
- Decisões de arquitetura vão para `ai-os/MEMORY/decisions/`.

## Como TESTAR

- Nada é "pronto" sem build + testes passando.
- Feature nova ou bug fix → escrever/rodar testes relevantes.
- Se não há framework de teste no alvo, montar o padrão do ecossistema antes.
- Se não for possível rodar (ambiente/dep faltando) → **declarar explicitamente** e explicar.

## Como fazer DEPLOY

- Contrato de deploy único, com adaptadores por destino (estático/SPA, Node/API, container, DB).
- Ambientes separados: preview (por branch) → staging → produção (com aprovação).
- Todo deployment guarda: revisão Git, provedor, ambiente, logs, URL, rollback.
- Nunca alteração automática em produção sem política + trilha de auditoria.

## Como REGISTRAR MEMÓRIA (passo 8)

Toda vez que você:
- **resolve um bug** → `ai-os/MEMORY/bugs/` (descrição, causa, correção, arquivos, commit, data)
- **toma decisão de arquitetura** → `ai-os/MEMORY/decisions/` (contexto, opções, escolha, porquê)
- **descobre um padrão reutilizável** → `ai-os/MEMORY/patterns/`
- **aprende uma lição** (algo que falhou) → `ai-os/MEMORY/lessons/`
- **otimiza performance/custo** → `ai-os/MEMORY/optimizations/`

Formato: um arquivo por evento, com frontmatter de evidência. Ver `ai-os/MEMORY/README.md`.
**Nunca** apagar registro antigo. Se ficou errado, criar novo registro que o corrige e linkar.

## Como ATUALIZAR CAPABILITIES

- Criou funcionalidade reutilizável → nova pasta em `ai-os/CAPABILITIES/`.
- Evoluiu uma existente → bump de versão no `capability.yaml`, registrar mudança.
- Detectou duplicação entre repos → registrar oportunidade de consolidação.

## Como ATUALIZAR o KNOWLEDGE GRAPH

- Novo repositório conectado → gerar nós (projeto→módulos→arquivos→funções→APIs→deploy).
- Nova capability → nó `capability` + arestas `DECLARES_CAPABILITY`.
- Novo evento de memória com evidência → nó `memory` + aresta `LEARNED`.

## Economia de tokens (regras práticas)

- Ler o **mínimo** necessário: usar Grep/Glob e subagentes, não despejar arquivos inteiros.
- Análise **incremental por delta**: reanalisar só o que o commit mudou.
- Preferir metadados/índices (`REPOSITORIES/<repo>/metadata.yaml`) a reler o repo cru.
- Cachear resultados de análise por commit; resultado anterior permanece auditável.
- Delegar buscas amplas a subagentes (contexto isolado) e receber só o resumo.

## Trabalho entre sessões (WORKSPACE)

Toda tarefa não-trivial mantém `ai-os/WORKSPACE/active-task/`:
- `current-goal.md` — objetivo em 1 parágrafo
- `execution-plan.md` — o plano aprovado
- `todos.json` — tarefas detalhadas com status
- `changed-files.json` — arquivos impactados
- `next-steps.md` — o que falta na próxima sessão

Assim o contexto sobrevive ao fim da conversa e o agente retoma como um engenheiro contínuo.

## Paralelismo e agentes

- Trabalho independente → múltiplas tool calls no mesmo turno.
- Exploração ampla de código → subagente `Explore` (read-only, rápido).
- Pesquisa/planejamento complexo → subagente `Plan` ou `general-purpose`.
- Só orquestrar múltiplos agentes (Workflow) quando o usuário pedir explicitamente.
