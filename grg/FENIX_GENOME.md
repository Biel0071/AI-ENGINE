# FÊNIX Ω∞ — GENOME (Constituição do Organismo)

Referência oficial do organismo. Nenhuma implementação futura pode contradizer este
documento sem uma migração arquitetural documentada. Cada número aqui é medido do código
real na data de geração; onde não é medível, diz-se "não medível" — nunca um valor chutado.

> Constituição viva: atualiza-se quando o código muda. Ver `FENIX_ARCHITECTURE_PRINCIPLES.md`
> para as regras permanentes que a governam.

## 1. Identidade

- **Nome**: GRG FÊNIX Ω∞
- **Natureza**: Sistema Operacional Cognitivo (não uma IA, não um agente — um SO que usa
  modelos de IA como mecanismos intercambiáveis).
- **Identidade permanente**: `src/kernel/organism-identity.js` — organismId, bornAt,
  linhagem append-only. Vive no store, não no modelo nem no processo.
- **Diferencial**: sobrevive à troca de modelo. `ai-gateway.js` resolve provedor por tabela
  de rotas; trocar Claude por Gemini/GPT é configuração. O patrimônio vive no store.

## 2. Arquitetura

Seis camadas, sentido único, sem ciclos. `kernel` é a raiz (216 fan-in). Detalhe em
`FENIX_ARCHITECTURE_MAP.md`.

```
entrada (server.js 192 rotas / worker.js) → organismo vivo (11 loops)
→ governança (gate) → domínio → superfícies cognitivas → kernel
```

## 3. Componentes (medido)

| Métrica | Valor |
|---|---|
| Arquivos `src/` | 161 |
| Módulos de topo | 46 |
| Linhas `src/` | 18.768 |
| Rotas HTTP | 192 (91 GET, 101 POST) |
| Arquivos de teste | 72 |
| Testes | passam integralmente (`node --test test/`) |
| Módulos simulated/stub | 0 |
| Sinais falsos | 0 |
| Dependências de runtime | 5 |

## 4. Relacionamentos

Ver `FENIX_COMPONENT_RELATIONSHIP.md`. Achado permanente: Event Bus (3 camadas) e os 5
Registries **não são duplicação** — são camadas e domínios distintos. Não fundir.

## 5. Capabilities / Skills / DNA

- **Capabilities**: `capabilities/capability-registry.js` (+ versões).
- **Skills**: `plugins/plugin-skills-ecosystem.js`.
- **Missão → patrimônio**: `missions/mission-artifacts.js` assina `mission.completed` e
  destila playbook + benchmark. Reuso medido por `reuseReport()`.
- **DNA / Benchmark comparativo**: parcial. Não há runner de benchmark, logo não há
  antes/depois automático — qualquer número de melhoria seria inventado (Regra 6 proíbe).
  O laws-engine já verifica melhoria *quando medições são fornecidas* pelo chamador.

## 6. Conhecimento

- **Memória**: `memory/memory-engine.js`.
- **Genoma**: `memory/knowledge-genome.js` (cápsulas, hash de conteúdo).
- **Grafo**: `knowledge-graph/knowledge-graph.js`.
- **Pipeline cognitivo real hoje**: só o cache exato do gateway antes do modelo. As demais
  camadas (facts, memory, knowledge, graph, ...) são nomeadas como ausentes, não simuladas.

## 7. Evolução

- **Runtime vivo**: `runtime/living-runtime.js` — 11 loops, 6 serviços por role, lease por role.
- **Auto-organização**: `onedeploy/continuous-improvement-loop.js` deriva achados de fontes reais.
- **Governança de promoção**: gate default-DENY; produção só por autorização humana sobre evidência.

## 8. Estado atual

- Base madura e honesta: 0 simulações, 0 sinais falsos, suíte verde.
- Fase 2 (identidade) criada; **ainda não ligada ao app.js** — pendência aberta.
- Sprint A: caminhos críticos de governança cobertos (council, laws, self-evolution, UCP, OS).

## 9. Dívidas técnicas

1. `organism-identity` não ligado ao boot nem persistido no schema.
2. Cobertura por módulo **não medível por heurística** — falta `c8`/istanbul.
3. Sem CI/CD (`.github/` vazio).
4. Sem OAuth de saída — toda integração de terceiros é lacuna.
5. Sem transporte realtime (painel é polling 5 s).
6. Chave de cripto derivada de literal em `security/cognitive-encryption.js:9`.
7. ApprovalEngine sem rejeição explícita (só approve/expire).
8. 8 superfícies cognitivas com sobreposição conceitual — consolidação futura, com rede.

## 10. Roadmap / próximos ciclos

Ver `FENIX_EVOLUTION_PLAN.md`. Ordem fixa: **cobrir → medir → consolidar → evoluir**.

- **B**: ligar identidade ao boot + schema v29.
- **C**: Capability Contract por níveis (maturidade medida).
- **D**: CI mínimo (`node --test` em push) + `c8` para cobertura real.
- **E**: consolidar superfícies cognitivas (após cobertura instrumentada).
- **Fora do horizonte** (decisão do dono): Vision Engine, Universal Builder, OAuth+conectores,
  deploy em produção.

## 11. Métricas de qualidade (gates permanentes)

- `node --test test/` verde antes de PR.
- `simulation-audit`: 0 sinais falsos, 0 simulated/stub.
- Contrato `measured()`/`unknown()`: ausência é unknown, nunca zero.
- Uma entrega por branch; merge por PR; produção por autorização humana.
