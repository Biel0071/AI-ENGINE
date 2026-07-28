# domains/ — Motores de Produto GRG

Cada motor é um **plugin do microkernel** que opera via `ports` do domínio (ver ARCHITECTURE →
Hexagonal). Nenhum acopla infra diretamente; todos são coordenados pelo AI Orchestrator
(`ai-os/AGENTS.md`) e alimentam/consultam o Knowledge Plane.

## Motores

- `software-factory.md` — gerar/evoluir sistemas por prompt reutilizando capabilities
- `white-label.md` — transformar qualquer sistema em white label multiempresa
- `app-factory.md` — empacotar para mobile/desktop/PWA/extensões
- `design-engine.md` — design system, UI kit, tokens, a11y

## Regra comum a todos

1. Buscar reutilização antes de gerar (CAPABILITIES/REPOSITORIES/MEMORY).
2. Multi-tenant: todo artefato pertence a um tenant/org/cliente.
3. Toda geração vira evidência na memória evolutiva + atualiza o catálogo.
4. Saída sempre com testes + docs. Deploy sempre com preview antes de produção.
