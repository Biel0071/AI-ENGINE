# AI ENGINE — CODING STANDARDS

> Padrões obrigatórios. Código que os viola não está pronto.

## Arquitetura

- **DDD + Hexagonal.** Domínio não conhece infra. Fala com `ports`; infra é `adapter`.
- Um bounded context = um módulo com fronteira clara. Sem import cruzado por dentro.
- **CQRS** onde leitura e escrita divergem (ex.: overview/analytics vs comandos).
- **Event-driven**: efeitos colaterais viram eventos no bus, não chamadas diretas acopladas.
- **Microkernel + plugins**: capabilities e connectors são plugáveis, não hard-coded.

## Nomenclatura

- Arquivos: `kebab-case.js/ts`. Classes: `PascalCase`. Funções/vars: `camelCase`.
- Nomes descritivos que dispensam comentário. `requestAnalysisFor`, não `doIt`.
- Entidades no singular (`Project`), coleções no plural (`projects`).
- IDs sempre `tenantId`, `projectId`, `runId` — nunca `id` solto entre contextos.

## Multi-tenant (regra de ouro)

- **Toda** query/entidade carrega `tenant_id`. Sem exceção.
- Autorização antes de qualquer operação: `authorize(tenantId, actorId, permission)`.
- Postgres com **Row Level Security** — nunca confiar só na aplicação.

## Segurança

- Validar entrada na **fronteira** (HTTP/API/entrada de usuário). Confiar no núcleo interno.
- Nunca interpolar valor de usuário em SQL/shell — parametrizar sempre.
- Segredos: fora do código, fora do banco principal, criptografados por tenant.
- Chave de IA nunca no cliente. Sempre via AI Gateway no backend.
- Toda ação com efeito gera **audit log** (quem, o quê, quando, evidência).
- Endpoint exposto sem auth → sinalizar explicitamente. Nunca criar serviço aberto em silêncio.

## Memória e evidência

- Memória é **append-only**. Nunca editar/apagar registro; criar novo que corrige e linkar.
- Todo `MemoryEvent` exige: `summary`, `evidence[]` (repo/commit/arquivo/símbolo), `confidence` (0–1).
- Evento sem evidência é **rejeitado** (é assim no control plane atual — manter).

## Testes (nada é "pronto" sem isto)

- Feature/bugfix → teste correspondente que passa.
- Pirâmide: muitos unit, alguns integration, poucos e2e nos caminhos críticos.
- Testes de integração que tocam banco → banco real (não mock) quando a divergência importa.
- Nome do teste descreve comportamento: `rejects memory event without evidence`.
- Se não dá pra rodar (ambiente/dep) → **declarar** e explicar; não fingir sucesso.
- Categorias-alvo por maturidade: unit → integration → e2e → security → performance.

## Comentários e documentação

- Padrão: **sem comentário**. O código bom se explica.
- Comentar só o *porquê* não-óbvio (restrição, workaround, invariante sutil).
- Nunca comentar o *o quê* nem referenciar a tarefa/PR atual dentro do código.
- Cada módulo/capability tem README curto. Docs de arquitetura vão para `ai-os/`.

## Erros e resiliência

- Erros tipados com significado (`NotFoundError`, `ConflictError`, `ForbiddenError`).
- Mapear erro → status HTTP na borda, não espalhar try/catch genérico.
- Fluxos longos: idempotentes, com retry e estado durável (worker/Temporal).
- Não adicionar tratamento defensivo para cenário impossível. Validar só na fronteira.

## Economia de tokens (regra de engenharia)

- Ler o mínimo: Grep/Glob/índices em vez de despejar arquivos.
- Análise incremental por delta; cachear por commit.
- Delegar exploração ampla a subagentes; consumir só o resumo.

## Git

- Não commitar sem pedido explícito do usuário.
- Branch nova, nunca direto em `main`. PR com título curto (<70 chars) e descrição estruturada.
- Nunca force-push/reset --hard/drop sem confirmação explícita.
- Preservar hooks (sem `--no-verify`) salvo pedido explícito.
- Stage de arquivos específicos, não `git add .`. Sinalizar arquivos com possível segredo.

## Definition of Done

Uma tarefa está pronta quando:
1. Reutilizou o que já existia (evidência de busca em CAPABILITIES/REPOSITORIES/MEMORY).
2. Código segue estes padrões e a arquitetura de `ARCHITECTURE.md`.
3. Build + testes passam (ou impossibilidade declarada).
4. Docs/capability atualizados.
5. Memória evolutiva registrada (decisão/bug/padrão) com evidência.
6. `WORKSPACE/active-task/` atualizado (changed-files, next-steps).
