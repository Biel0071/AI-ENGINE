# ADR 002: Desacoplamento Total via Contratos (Interfaces)

## Contexto
O Kernel atual instancia diretamente classes (ex: `PostgresStore`, `AIRouter`, `GitHubConnector`), tornando o núcleo fortemente acoplado às ferramentas. Se trocarmos Redis por outro broker, o Kernel precisaria ser alterado.

## Decisão
Adoção estrita de **Design by Contract**. O Kernel e o Supervisor falarão *exclusivamente* com contratos formais (Interfaces no formato JSDoc/TypeScript).
Nenhum módulo chamará código direto de outro módulo ou plugin. A ponte sempre será o `CapabilityManager` ou o `EventBus`.

### Contratos Obrigatórios (Nível Kernel):
- `IRuntime` (Ciclo de vida do nó)
- `IPlugin` (Manifest, Hooks, Rollback)
- `ICapability` (Permissões, Riscos, Execução)
- `IAgent` (Heartbeat, State, Context, Memory)
- `IMemory` / `IKnowledgeGraph` (Vetorização, Indexação)
- `IEventBus` (Pub/Sub com prioridades)
- `IAIGateway` (Routing, Cost, Validation)
- `IVault` (Secret Manager abstraído do SO)
- `IServiceProvider` (Abstração Windows/Linux)
- `ITelemetry` (Metrics, Tracing, Logs)
- `IDoctor` (Health, Diagnostics, Recovery)
- `IScheduler` (Cron, Queues, Retry)

## Consequências
- Os testes unitários ficam triviais através de Mocks aderentes ao contrato.
- Terceiros podem construir Plugins que o Kernel aceitará se obedecerem ao `IPlugin`.
- O acoplamento cai virtualmente a zero.
