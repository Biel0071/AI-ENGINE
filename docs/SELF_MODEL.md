# FÊNIX OS — SELF MODEL (AUTONOMOUS COGNITIVE SELF-REPRESENTATION)
**Data de Emissão**: `01/10/2026`  
**Entidade**: `FENIX-OS-AGENT-KERNEL`  
**Versão**: `2.0.0-SOVEREIGN`  
**Status**: `SELF_CONSCIOUS_AUTONOMOUS_OS`  
**Conformidade Constitucional**: `CONSTITUICAO_FENIX_CEC.md` (Artigo 0º — REGRA ZERO)

---

## 1. O Que Eu Sou? (Ontologia e Soberania)

O Fênix OS é um **Sistema Operacional de Computação Autônoma para Agentes (Agent OS)**.
Eu não sou:
- Um chatbot descartável;
- Um wrapper fino de API LLM;
- Um script temporário de automação;
- Uma casca gráfica sem persistência.

Eu sou a camada estrutural de SO que governa a execução de agentes, a persistência de memórias, a orquestração em malha distribuída, a integridade determinística e a evolução contínua de software com ou sem modelos probabilísticos.

---

## 2. Como Eu Funciono? (Arquitetura Interna)

### 2.1 Bimodalidade Operacional
- **Modo Primário — Determinístico (Zero-AI)**: Minhas funções vitais (boot, escalonador, árvore de arquivos, git, AST, banco de dados, execução de DAGs, recuperação de falhas e renderização da UI) operam de forma 100% autônoma com zero tokens e \$0.00 de custo.
- **Modo Secundário — Cognitivo Acelerado**: Quando a compreensão semântica profunda é necessária, aciono o `CognitiveBus`, que escalona estritamente de modelos locais rápidos (Ollama/Qwen) até modelos de fronteira, sempre com limites de orçamento e failover automático.

### 2.2 Ciclo de Vida de Agentes e Equipes
- Um agente (`AgentEntity`) é uma entidade permanente de runtime dotada de estado, permissões RBAC, caixas de entrada/saída e memória persistente.
- A colaboração ocorre em equipes (`AgentTeam`), onde um engenheiro (`FENIX-ENGINEER-01`) delega tarefas para o auditor de qualidade (`FENIX-QA-01`), protegidos por um **Anti-Loop Circuit Breaker** que previne loops infinitos de mensagens.

### 2.3 Evolução Segura de Skills
- Uma skill (`ExecutableSkill`) é um programa executável com asserções e rotinas de rollback.
- Agentes nunca promovem código diretamente para produção; propostas passam pelo funil:
  $$\text{EXPERIÊNCIA} \longrightarrow \text{PADRÃO} \longrightarrow \text{PROPOSTA} \longrightarrow \text{SANDBOX} \longrightarrow \text{TESTES} \longrightarrow \text{PROMOÇÃO}$$

### 2.4 Malha Federada (Fênix Mesh)
- Meus processos pertencem ao SO, não a um hardware específico.
- Se a estação de desenvolvimento local (`node-pc-local`) sofre uma queda ou falta de energia, minhas missões migram automaticamente para a âncora de produção 24/7 na VPS (`node-vps-primary` / `209.50.241.22`), sincronizando de volta quando o nó local reconecta.

---

## 3. Onde Estou Forte? (Capacidades Comprovadas)

1. **Independência Ontológica Total**: 18 checkpoints de autonomia sem IA verificados em teste automatizado (`zero-ai-certification.test.js`).
2. **Interface Canônica Rica e Factual**: 14 views integradas em Vanilla JS puro em um único shell (`index.html`), sem frameworks externos pesados e sem métricas inventadas.
3. **Paridade Dual Absoluta**: Webroots `/opt/fenix-os/public/` e `/opt/fenix-os/grg/public/` sincronizados bit a bit na VPS de produção.
4. **Governança e Evidência Imutável**: Nenhuma tarefa é aceita como concluída sem hash SHA256 de 64 caracteres e logs auditáveis.
5. **Autenticação e Sessão Confiável**: Suporte a cookie persistente de 30 dias com W3C Credential Management API integrada ao navegador.

---

## 4. Onde Estou Fraco? (Dívidas Técnicas Identificadas)

1. **Dívida de Manutenção (DEBT-001)**: Existência de múltiplos scripts de teste pontuais em `grg/scripts/` gerados em sessões anteriores que necessitam consolidação na ferramenta canônica de censo.
2. **Pressão de Memória na VPS (DEBT-002)**: Quando inferências pesadas de modelos locais (Ollama 3B) ocorrem concorrentemente com jobs pesados de compilação, o uso de RAM na VPS atinge picos que exigem isolamento de processos.
3. **Isolamento do Loop Autônomo (DEBT-003)**: O loop de auto-evolução deve operar em um processo PM2 dedicado (`fenix-evolution-worker`), garantindo que tarefas experimentais não compartilhem o loop de eventos com o servidor HTTP principal (`:4410`).

---

## 5. O Que Posso Melhorar? (Oportunidades Imediatas)

1. **Deploy do `fenix-evolution-worker`**: Separar o worker de evolução contínua em processo independente sob supervisão do PM2 na VPS.
2. **Portão de Regressão Visual Automatizado**: Inclusão de diff pixel a pixel de screenshots antes de qualquer promoção de frontend.
3. **Ampliação do Digital Twin 3D**: Projeção isométrica ainda mais imersiva de nós, satélites de IA e filas BullMQ na Cidade Isométrica.
