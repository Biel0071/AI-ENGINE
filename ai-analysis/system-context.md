# AI-ENGINE System Context

## O que o AI-ENGINE faz
AI-ENGINE possui um core funcional em `dist` para processamento de mensagens e uma camada de inteligencia em `engine` que analisa projetos de software sem substituir o runtime existente.

## Como analisa projetos
Pipeline atual da camada de inteligencia:
1. `projectScanner.scanProject(rootPath)` varre estrutura, arquivos, stack e entrypoints reais.
2. `architectureAnalyzer.analyzeArchitecture(scanResult)` detecta camadas, fluxos, dependencias e gargalos.
3. `diagnosticEngine.runDiagnostics(scanResult, architecture)` identifica riscos e problemas estruturais.
4. `contextBuilder.buildContext(...)` sintetiza resumo operacional e pontos criticos.

## Como gera tokens
`tokenizer.tokenizeProject({ context })` converte fluxos e pontos criticos em tokens priorizados com:
- `id`
- `description`
- `files`
- `importance`
- `confidence`
- `sources`

## Como aprende
`learningLoop.runLearningLoop(currentState, previousState)` compara tokens da execucao atual com baseline anterior e gera:
- `changes` (added-token, updated-token, removed-token)
- `improvements`

A baseline vem de duas fontes:
- estado passado explicitamente na chamada
- estado persistido em `memory/projects/{projectName}`

## Como orienta desenvolvimento
`guidanceEngine.generateGuidance({ context, diagnostics, tokens })` prioriza:
- `nextSteps`: o que fazer agora
- `fixes`: correcoes de alto impacto
- `optimizations`: melhorias em tokens relevantes

## Contrato padrao de saida
`intelligenceLayer.analyzeProject` retorna sempre:
- `projectSummary`
- `architecture`
- `tokens`
- `insights`
- `nextActions`

complementado por `diagnostics`, `context`, `learning` e `memoryPersistence`.

## Garantias atuais
- Core em `dist` permanece intacto.
- Memoria persistente por projeto com versionamento e historico append-only.
- Analise baseada em evidencia de arquivos reais e metadados de confianca.
