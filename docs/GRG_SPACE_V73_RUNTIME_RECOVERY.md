# GRG SPACE — FÊNIX OS V7.3: CITY RUNTIME RECOVERY & ZERO-MOCK RESILIENCE

**Data de Emissão:** 03 de Novembro de 2026  
**Status:** IMPLEMENTADO & VERIFICADO (100% PASS)  
**Branch:** `fenix/operational-os-20260924`  
**Escopo:** Eliminação de Erros Bloqueantes, Máquina de Estados Finita & Tolerância a Falhas Offline  

---

## 1. Eliminação do Banner Bloqueante Antigo

### O Problema Pré-V7.3
Anteriormente, quando ocorria um atraso ou interrupção temporária na chamada de telemetria `/api/v2/living-city/state` ou `/api/v2/agents`, o sistema exibia um alerta invasivo e bloqueante no topo da tela:
> *"Não foi possível conectar ao runtime da Cidade. Tente novamente."*

Esse banner desabilitava a navegação da Cidade 3D, ocultava o minimap e gerava badges de "indisponível" que travavam a experiência do operador, mesmo que a cena 3D e os edifícios locais estivessem completamente renderizados e funcionais.

### A Solução V7.3
O fluxo foi completamente reconstruído em `ai-engine/grg/public/index.html` (método `loadCityView` e auxiliares):
1. **Remoção de Banners Intrusivos:** O alerta bloqueante foi eliminado.
2. **Navegabilidade Offline Garantida:** Se a conexão falhar ou demorar, a cena Three.js permanece ativa, navegável e responsiva com as estruturas canônicas em suas posições oficiais.
3. **Cache de Snapshot Local:** `window.__fenixCitySnapshotCache` retém o último estado fático válido, permitindo que a cidade renderize instantaneamente sem flashes de conteúdo vazio.

---

## 2. Máquina de Estados Finita do Runtime da Cidade

O ciclo de vida da conexão do mundo 3D agora é governado por uma máquina de estados explícita:

| Estado | Significado | Comportamento Visual | Ação Automática |
| :--- | :--- | :--- | :--- |
| `UNKNOWN` | Estado inicial antes de qualquer tentativa | Marcadores com `—` honesto | Inicia sincronização |
| `CONNECTING` | Handshake e busca do snapshot da API | Indicador discreto no header | Timeout de guarda de 6s |
| `CONNECTED` | WebSocket / API conectado com telemetria ativa | Tag verde `44 ONLINE · 10 SETORES` | Streaming SSE / Polling ativo |
| `DEGRADED` | Falha em uma das APIs secundárias | Exibição de entidades confirmadas | Fallback para `/api/v2/agents` |
| `DISCONNECTED`| Rede indisponível ou servidor inalcançável | Tag âmbar discreta `MODO OFFLINE (CACHE)` | Backoff exponencial ativo |
| `STALE` | Dados com idade superior a 60s | Alerta sutil de reconexão | Re-sincronização transparente |

---

## 3. Algoritmo de Reconexão com Exponential Backoff

Para evitar tempestades de requisições (*thundering herd*) contra o servidor Node/Express (porta 4410/3000), foi implementado o loop exponencial com jitter:

```javascript
window.scheduleCityReconnect = function(attempt = 0) {
  if (window.__cityReconnectTimer) clearTimeout(window.__cityReconnectTimer);
  const baseDelay = 1500;
  const maxDelay = 30000;
  const delay = Math.min(baseDelay * Math.pow(1.8, attempt), maxDelay) + Math.random() * 500;
  
  window.__cityReconnectTimer = setTimeout(() => {
    if (window.__currentView === 'city') {
      window.loadCityView({ background: true, attempt: attempt + 1 });
    }
  }, delay);
};
```

### Características de Resiliência:
- **Silencioso em Background:** A reconexão opera em plano de fundo sem fechar modais nem interromper o movimento de câmera ou inspeção do operador.
- **Cancelamento Inteligente:** Se o usuário mudar de view, o timer de reconexão da cidade é pausado e retomado apenas ao retornar à visualização 3D.

---

## 4. Conformidade Estrita com a Regra Constitucional II (Zero-Mock)

1. **Ausência Honesta Preservada:**
   - Todo slot inicial de dados não medidos exibe `—`.
   - Nenhuma métrica sintética é fabricada em código local para "fingir" conexão ativa.
2. **Snapshot Provenance:**
   - O objeto de estado diferencia explicitamente entidades medidas (`source: 'runtime-measured'`) de geometrias estáticas locais (`source: 'canonical-registry'`).
3. **Validação por Testes:**
   - A suíte de 25 testes constitucionais (`node --test ai-engine/grg/test/frontend-honesty.test.js` e companheiros) valida que zero valores fabricados chegam ao DOM.
