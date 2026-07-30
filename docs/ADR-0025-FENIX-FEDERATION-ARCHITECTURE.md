# ADR-0025 — FÊNIX FEDERATION Architecture, Discovery Fabric & Cognitive Mesh

## Status

Aceito para o FÊNIX CEC Core Architecture v3.

## Contexto

A arquitetura do FÊNIX CEC evoluiu de um orquestrador de ferramentas fixas para um sistema federado completo. O ecossistema exige que recursos (VPS, GPUs, containers, MCP Servers, modelos de IA, ferramentas e agentes de engenharia) sejam descobertos dinamicamente sem acoplamento a nomes de fornecedores específicos. A alocação de trabalho deve ser guiada por capacidades, pontuações de qualidade/confiança e governança unificada.

## Decisão

1. **FÊNIX FEDERATION Layer**: O FÊNIX opera sobre uma federação de recursos declarativos. O `Objective Engine` recebe intenções declarativas e o `Mission Control` compõe DAGs de tarefas governadas.
2. **Federation Registry ("Registry of Everything")**: O catálogo universal utiliza um modelo unificado de entidade (`FederationEntity`) cobrindo as taxonomias: `Human`, `Agent`, `Service`, `Tool`, `Resource`, `Capability`, `Cognitive`, `Workflow`, `Mission` e `Policy`.
3. **Discovery Fabric (Motor Autônomo Zero-Touch)**: Um mecanismo de varredura contínua e desacoplada detecta novos recursos e remove nós inativos através do pipeline:
   `Conectar ──► Inventariar ──► Digital Twin ──► Resource Node ──► Eventos ──► Registrar Capacidades ──► Disponibilizar ao Mesh`.
4. **Capability Mesh & Marketplace**: A resolução de tarefas para um objetivo não é feita por escolha direta do usuário, mas por leilão dinâmico/ranking considerando:
   - `quality` (índice de sucesso histórico)
   - `confidence` (aderência do provedor ao tipo de tarefa)
   - `cost` (custo financeiro/computacional)
   - `latency` (tempo estimado de execução)
5. **Cognitive Fabric**: Extensão unificada de memória que agrega Memória Contextual, Ontologia, Genomas Digitais, Decisões de Arquitetura, Hipóteses, Experimentos, Evidências Operacionais e Lições Aprendidas.
6. **Resource Fabric Modulado em 9 Domínios**:
   - `Compute Fabric` (VPS, Local, GPUs, Kubernetes)
   - `Storage Fabric` (NAS, S3, Discos Locais)
   - `Network Fabric` (Túneis Cloudflare, DNS, Subredes)
   - `AI Fabric` (Ollama, Groq, OpenRouter, Provedores de LLM)
   - `Engineering Fabric` (GitHub Actions, CI/CD, MCP Servers)
   - `Identity Fabric` (RBAC, Tenants, Tokens)
   - `Secrets Fabric` (Criptografia, Cofres de Senha)
   - `Security Fabric` (Zero-Trust, Guardrails, Auditoria)
   - `Observability Fabric` (Logs Pino, Métricas Prometheus, Traces)

## Invariantes

1. Nenhuma ferramenta ou provedor externo pode ser codificado de forma rígida em pipelines de missão.
2. Toda entidade federada deve possuir um esquema validado por `federation-entity.schema.json`.
3. O Discovery Fabric não pode adicionar recursos a estados ativos sem a geração de Digital Twin e auditoria de segurança.
4. Nenhuma tarefa vermelha (alto risco/produção) pode ser executada no Capability Mesh sem autorização prévia.
5. O Cognitive Fabric é a única fonte de verdade para decisões de arquitetura e aprendizado compilado.

## Limites

Esta especificação define os contratos e esquemas declarativos. A implementação física de coletores específicos de Discovery (ex: escaneamento de rede SSH profundo) e conectores de nuvem avançados será ativada progressivamente em fatias do CCMAP.
