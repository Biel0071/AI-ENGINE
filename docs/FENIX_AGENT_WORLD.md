# FÊNIX OS — AGENT WORLD SPECIFICATION
## AGENTES COMO HABITANTES FÍSICOS DO MUNDO DIGITAL

> **ESPECIFICAÇÃO DE AGENTES ESPACIAIS**
> No Fênix OS, agentes não são meros registros de banco de dados ou cartões de texto. Eles são personagens com presença física, movimento, mesa de trabalho e comportamento observável.

---

## 1. Estados da Máquina Comportamental do Agente

| Estado | Significado Operacional | Comportamento Visual no Mundo |
| :--- | :--- | :--- |
| `IDLE` | Aguardando atribuição de missão. | Em pé na calçada ou sentado na sua mesa em repouso. |
| `WALKING` | Em deslocamento entre prédios ou salas. | Animação de caminhada seguindo a rota A* pelas ruas. |
| `WORKING` | Executando tarefas técnicas de engenharia. | Sentado à mesa, digitando no terminal com monitores acesos. |
| `THINKING` | Em inferência cognitiva ou planejamento. | Balão de diálogo com ícone de engrenagem/cérebro sobre a cabeça. |
| `MEETING` | Em sessão coletiva com outros agentes. | Sentado ao redor da mesa na Sala de Reunião com balões de fala. |
| `BLOCKED` | Impedido por dependência ou erro externo. | Ícone `⚠ BLOCKED` pulsando em âmbar sobre o personagem. |
| `SUCCESS` | Concluiu a missão com validação. | Efeito de celebração sutil e notificação na linha do tempo. |
| `ERROR` | Falha crítica na execução do job. | Indicador vermelho com emissão de alerta para o War Room. |

---

## 2. Fluxo da Criação Física de Agente (`AgentFactory`)

Quando um agente é criado (seja pela UI ou pelo chat do Fênix):
1. **Instanciação**: `AgentFactory.createAgent({ role, domain, skills, tools })`.
2. **Registro**: Inserção no `AgentRegistry` com geração de ID imutável.
3. **Alocação Espacial**: O `OfficeManager` encontra uma estação de trabalho vaga (`wsId`) no distrito apropriado.
4. **Spawn no Mundo**: O `WorldModel` cria o nó do agente associando-o à sala. O motor visual Pixi instancia o sprite e o ancora no grid.
5. **Prontidão**: O agente fica disponível para receber missões de clientes e empresas.
