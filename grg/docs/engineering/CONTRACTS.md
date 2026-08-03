# Contratos do Sistema (Interfaces)

Abaixo estão definidos (em pseudocódigo JSDoc/TypeScript) os contratos centrais da arquitetura do FÊNIX OS v2.0. O Kernel depende exclusivamentes destas interfaces.

## 1. IRuntime
Gerencia o ciclo de vida e estado do nó local do sistema operacional de IA.
```typescript
interface IRuntime {
  boot(): Promise<void>;
  shutdown(force?: boolean): Promise<void>;
  getState(): RuntimeState;
  getManifest(): SystemManifest;
}
```

## 2. IServiceProvider
Abstrai o registro do daemon no sistema operacional hospedeiro.
```typescript
interface IServiceProvider {
  install(config: ServiceConfig): Promise<void>;
  uninstall(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  status(): Promise<ServiceStatus>;
}
```

## 3. IVault (FÊNIX Vault)
Garante armazenamento seguro sem o uso de `.env` aberto, delegando a criptografia para OS (DPAPI/Keychain).
```typescript
interface IVault {
  store(key: string, secret: string): Promise<void>;
  retrieve(key: string): Promise<string>;
  rotate(key: string, newSecret: string): Promise<void>;
  listKeys(): Promise<string[]>;
}
```

## 4. IAIGateway (Router & Scheduler)
Roteador inteligente de provedores LLM.
```typescript
interface IAIGateway {
  route(request: PromptRequest, context: GatewayContext): Promise<PromptResponse>;
  estimateCost(request: PromptRequest): Promise<CostEstimate>;
  fallback(request: PromptRequest, errors: Error[]): Promise<PromptResponse>;
}
```

## 5. IEventBus
Barramento de mensagens com suporte a prioridade, permitindo que tudo no sistema seja um evento.
```typescript
enum EventPriority { CRITICAL, HIGH, NORMAL, LOW, BACKGROUND }

interface IEventBus {
  publish(event: DomainEvent, priority?: EventPriority): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): void;
  replay(fromTimestamp: number): Promise<void>;
}
```

## 6. ICapability
Unidade atômica de trabalho cognitivo (ferramenta) que o Mission Engine utiliza.
```typescript
interface ICapability {
  id: string;
  name: string;
  evaluate(context: CapabilityContext): Promise<EvaluationResult>; // Risco, Custo, Tempo
  execute(params: any): Promise<ExecutionResult>;
  permissionsNeeded(): string[];
}
```

## 7. IMissionEngine
Núcleo cognitivo que planeja e fragmenta objetivos em tarefas usando Capabilities.
```typescript
interface IMissionEngine {
  submit(goal: Goal): Promise<MissionId>;
  plan(missionId: MissionId): Promise<MissionPlan>;
  execute(missionId: MissionId): Promise<MissionResult>;
  validate(missionId: MissionId): Promise<ValidationResult>;
  learn(missionId: MissionId): Promise<void>;
}
```

## 8. IPlugin
Contrato para todas as integrações modulares (CRM, HR, WhatsApp).
```typescript
interface IPlugin {
  manifest(): PluginManifest;
  onInstall(): Promise<void>;
  onStart(): Promise<void>;
  onStop(): Promise<void>;
  onUninstall(): Promise<void>;
  health(): Promise<HealthStatus>;
}
```

## 9. IDoctor
Motor de autocura e observabilidade corretiva.
```typescript
interface IDoctor {
  analyze(symptoms: Symptom[]): Promise<Diagnosis>;
  remediate(diagnosis: Diagnosis): Promise<RemediationResult>;
  rollback(remediationId: string): Promise<void>;
}
```
