# FÊNIX Ω∞ — RELACIONAMENTO ENTRE COMPONENTES

Análise de sobreposição real, por leitura de código. A MISSION-0002 pede "eliminar
duplicações / unificar registries / consolidar eventos". Antes de fundir qualquer coisa, o
papel de Arquiteto Permanente exige distinguir **duplicação** (mesma responsabilidade em
dois lugares) de **camada** (responsabilidades distintas que colaboram). Fundir uma camada
não é consolidar — é quebrar.

## 1. Sistemas de evento — CAMADA, não duplicação

| Arquivo | Linhas | Responsabilidade |
|---|---|---|
| `kernel/event-bus.js` | 42 | pub/sub in-process (`emit`/`subscribe`) |
| `eventing/event-store.js` | 38 | log durável (`append`/`readStream`), hash, `assertNoSecrets` |
| `eventing/fabric-event-bus.js` | 6 | **compõe os dois**: `append` no store → `emit` no bus |

`FabricEventBus.publish()` faz `append(input)` e depois `emit(event.type)` + `emit('fabric.event')`.
São três responsabilidades limpas: efêmero, durável, e o compositor. **Veredito: NÃO fundir.**
Unificá-los colapsaria persistência e notificação num só ponto — perda de separação correta.
Oportunidade real: documentar o contrato das três camadas (feito aqui), não mesclar.

## 2. Registries — DOMÍNIOS DISTINTOS, não duplicação

| Registry | Linhas | Domínio (o substantivo que guarda) |
|---|---|---|
| `capabilities/capability-registry.js` | 64 | capacidades declaradas + versões |
| `execution/tool-registry.js` | 44 | ferramentas executáveis (ciclo de vida ≠ saúde) |
| `fabric/service-registry.js` | 27 | serviços de rede enrolados |
| `infrastructure/monitoring/health-registry.js` | 34 | probes de saúde |
| `execution/script-library.js` | 37 | scripts assinados |

Cinco substantivos diferentes. **Veredito: NÃO unificar num "registry único".** A instrução
da missão presume que "registry" é um conceito repetido; na verdade é um sufixo aplicado a
cinco domínios sem relação. Unificá-los criaria um god-object — o oposto de simplicidade.
Oportunidade real: um **contrato de interface comum** (`get`/`list`/`register`/`history`)
que cada um já implementa de fato, documentado e testado — não uma classe base.

## 3. Superfícies cognitivas — AQUI está a duplicação real

Estas oito se sobrepõem em conceito (ver `FENIX_ORGANISM_GRAPH.md` para o grafo):

| Superfície | Arquivos | Sobrepõe com |
|---|---|---|
| `omega` | 9 | cognitive, nexus (council, research, economy) |
| `omega-infinity` | 6 | evolution, cognitive (dna, self-evolution, meta) |
| `nexus` | 4 | omega (unified-core, marketplace, timeline) |
| `keos` | 4 | uios (protocol, adapters, constitution) |
| `uios` | 4 | keos, capabilities (capability/knowledge OS) |
| `scos` | 4 | software-factory, onedeploy (creation, design) |
| `cognitive` | 11 | omega, omega-infinity |
| `agents` | 2 | cognitive-hierarchy |

**Veredito: candidatas reais a consolidação — MAS só depois de cobertura de teste.**
35 desses arquivos não têm teste direto. Consolidar sem rede é o risco que a diretriz
aprovada proíbe. Por isso o Sprint A (cobertura) precede qualquer fusão.

## Conclusão da análise

Dos três alvos que a missão nomeia para consolidação, **dois não são duplicação** (eventos e
registries são camadas/domínios corretos). O único alvo real são as 8 superfícies
cognitivas — e elas exigem teste antes de tocar. Isto **inverte a ordem da missão**:
cobertura (Sprint A) vem antes de eliminação de duplicação, não depois.
