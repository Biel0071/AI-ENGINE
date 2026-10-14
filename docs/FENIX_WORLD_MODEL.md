# FÊNIX OS — WORLD MODEL SPECIFICATION
## MODELAGEM ONTOLÓGICA & ESPACIAL DO UNIVERSO FÊNIX

> **DOCUMENTO DE ESPECIFICAÇÃO DE DADOS & GRAFO ESPACIAL**
> O World Model do Fênix OS unifica o modelo de dados espacial, corporativo e relacional de todo o sistema. Ele atua como a única fonte de verdade para coordenadas, ocupação de salas, alocação de equipes e relacionamentos multi-agente.

---

## 1. Hierarquia Espacial & Corporativa

```text
World (Fênix Metropolis)
 │
 ├── District (14 Distritos Especializados)
 │    └── Building (Edifícios Corporativos & Estruturais)
 │         └── Floor (Andares com Cutaway)
 │              └── Room (Salas & Áreas de Trabalho)
 │                   ├── Workstation (Mesas com Computador e Cadeira)
 │                   ├── Agent (Agente residente ou visitante)
 │                   ├── Team (Esquadrão alocado)
 │                   └── Mission (Missão em execução local)
 │
 └── Company (Empresas Residentes: Depósito Mais, iDrinks, ZapAI, etc.)
      ├── Department (Engenharia, Vendas, Atendimento, Segurança)
      ├── Agent (Quadro funcional da empresa)
      ├── Project (Repositórios e workspaces)
      ├── Mission (Demandas de negócio)
      ├── System (Serviços e APIs ativas)
      ├── Memory (Base de conhecimento corporativa)
      └── Events (Audit trail e histórico de operações)
```

---

## 2. Dicionário Canônico de Entidades

### 2.1 World (`world`)
- `id`: Identificador único do universo (`fenix-main-world`).
- `name`: Nome da metrópole (`Fênix Metropolis`).
- `gridSize`: Dimensões da matriz isométrica (`128 x 128` tiles).
- `districts`: Lista de referências para os 14 distritos.
- `weather`: Clima factual sincronizado com a telemetria (`24°C, Ensolarado`).
- `timeOfDay`: Horário factual do sistema (`15:42`).

### 2.2 District (`district`)
- `id`: Identificador canônico (ex.: `engineering`, `research`, `business`, `porto`).
- `name`: Nome legível (ex.: `Engineering District`, `Porto de Integração`).
- `label`: Badge exibido no mundo 2.5D (ex.: `ENGINEERING - Desenvolvimento`).
- `color`: Cor primária HSL de iluminação neon (ex.: `#10B981`, `#00D9FF`, `#A855F7`).
- `bounds`: Coordenadas retangulares no grid isométrico (`{ x1, y1, x2, y2 }`).
- `center`: Ponto central para ancoragem da câmera (`{ x, y }`).
- `buildings`: Lista de IDs de edifícios pertencentes ao distrito.
- `capabilities`: Conjunto de capacidades do ecossistema associadas ao distrito.

### 2.3 Building (`building`)
- `id`: Identificador único (ex.: `bld-fenix-hq`, `bld-deposito-mais`, `bld-dev-loft`).
- `districtId`: ID do distrito onde o prédio está situado.
- `name`: Nome da estrutura (ex.: `Fênix HQ Spire`, `Depósito Mais Hub`).
- `companyId`: ID da empresa proprietária ou locatária (opcional).
- `buildingType`: Tipo geométrico de renderização (`spire`, `warehouse`, `loft`, `datacenter`, `dome`).
- `gridPos`: Coordenada de base no mapa isométrico (`{ col, row }`).
- `size`: Dimensões de pegada no chão (`{ width, height }`).
- `floors`: Array de andares estruturados com interiores navegáveis.
- `status`: Estado operacional do edifício (`HEALTHY`, `WARNING`, `CRITICAL_ERROR`).

### 2.4 Floor (`floor`)
- `id`: Identificador do andar (ex.: `bld-fenix-hq-f2`).
- `buildingId`: ID do prédio pai.
- `floorNumber`: Número sequencial (ex.: `0` para térreo, `2` para segundo andar).
- `name`: Título descritivo (ex.: `Andar 2 - Engenharia & Desenvolvimento`).
- `rooms`: Lista de salas contidas no andar.
- `capacity`: Lotação máxima de agentes simultâneos.

### 2.5 Room (`room`)
- `id`: Identificador da sala (ex.: `room-backend-office`, `room-war-room`).
- `floorId`: ID do andar pai.
- `name`: Nome da sala (ex.: `Backend Office`, `War Room de Crise`).
- `type`: Tipo de cômodo (`OFFICE`, `MEETING`, `WAR_ROOM`, `LOUNGE`, `LAB`).
- `bounds`: Dimensões internas no grid do andar (`{ col1, row1, col2, row2 }`).
- `workstations`: Lista de mesas de trabalho com monitor, cadeira e props.
- `currentOccupants`: Lista de IDs dos agentes presentes na sala.

### 2.6 Company (`company`)
- `id`: Identificador único (ex.: `deposito-mais`, `idrinks`, `ai-engine`, `zapai-crm`).
- `name`: Nome corporativo (ex.: `Depósito Mais`).
- `segment`: Ramo de atuação (ex.: `Construção & Materiais`).
- `location`: Cidade / UF e data de fundação (ex.: `Vespasiano - MG | Desde 2020`).
- `description`: Missão e escopo de atuação no mercado.
- `headquartersBuildingId`: ID do prédio físico correspondente na cidade (`bld-deposito-mais`).
- `departments`: Lista de departamentos operacionais.
- `assignedAgents`: Agentes contratados ou alocados para a empresa.
- `activeMissions`: Missões abertas no momento.
- `telemetry`: Métricas factuais (`agentsCount`, `missionsCount`, `projectsCount`, `performance`).

### 2.7 Agent (`agent`)
- `id`: Identificador único (ex.: `agent-backend`, `agent-security`, `agent-qa`).
- `name`: Nome de exibição (ex.: `Backend Specialist`, `Security Sentinel`).
- `role`: Papel de atuação (`developer`, `security`, `qa`, `architect`, `support`).
- `companyId`: Empresa a qual o agente presta serviços.
- `currentLocation`: Posição espacial (`{ districtId, buildingId, floorNumber, roomId, wsId }`).
- `state`: Estado de máquina observável:
  `IDLE | WALKING | WORKING | THINKING | MEETING | TRAVELING | WAITING | EXECUTING | BLOCKED | ERROR | SUCCESS | OFFLINE`.
- `currentMissionId`: ID da missão que o agente está desempenhando no momento.
- `spriteConfig`: Definição visual (paleta de cabelo, roupa, acessórios e animações).
- `skills`: Lista de habilidades registradas no `SkillRegistry`.
- `tools`: Ferramentas autorizadas (ex.: `Playwright`, `Git`, `Terminal`, `Docker`).

---

## 3. Matriz dos 14 Distritos Canônicos do Fênix OS

| # | Distrito | Cor Neon | Propósito / Domínio de Software | Prédios Principais |
| :- | :--- | :--- | :--- | :--- |
| **01** | `FÊNIX HQ` | `#00D9FF` (Ciano) | Núcleo de Governança, Orquestração e Kernel | Fênix HQ Spire, Praça Central, Fonte |
| **02** | `ENGINEERING` | `#10B981` (Verde) | Desenvolvimento Backend, APIs e Runtimes | Engineering Tower, Code Forge |
| **03** | `RESEARCH` | `#A855F7` (Púrpura) | Modelos Cognitivos, LLMs, RAG e IA Avançada | Neural Dome, R&D Labs |
| **04** | `DESIGN` | `#EC4899` (Rosa) | Design System, UI/UX, Telas e Micro-interações | UI Pavilion, Creative Loft |
| **05** | `SECURITY` | `#EF4444` (Vermelho) | Zero-Trust, Criptografia, RBAC e Monitoramento | Shield Citadel, Defense Hub |
| **06** | `DATA CENTER` | `#3B82F6` (Azul) | Bancos de Dados, Redis, Qdrant e Persistência | Database Silos, Vault |
| **07** | `BUSINESS` | `#F59E0B` (Âmbar) | Vendas, Comercial, Billing e Estratégia | Commerce Plaza, Finance Tower |
| **08** | `OPERATIONS` | `#06B6D4` (Teal) | CI/CD, Deploys, PM2, Jobs e Supervisão | Operations Center, Launch Pad |
| **09** | `PORTO` | `#0284C7` (Oceano) | Logística, Integrações Externas e Webhooks | Cais de Carga, Docas 01-04 |
| **10** | `INDUSTRIAL` | `#D97706` (Ferrugem) | Software Factory, Geração e Pipelines Pesados | Fábrica de Software, Depósitos |
| **11** | `HOSPITAL` | `#14B8A6` (Menta) | Auto-healer, Recuperação e Saúde do Sistema | Hospital Central, Clinic Bay |
| **12** | `SHOPPING` | `#8B5CF6` (Lavanda) | Marketplace de Skills, Conectores e Plugins | Marketplace Mall, Tech Pavilion |
| **13** | `RESIDENCIAL` | `#64748B` (Ardósia) | Moradia de Agentes, Standby e Treinamento | Vila dos Agentes, Blocos Residenciais |
| **14** | `PRAIA & LAZER` | `#065F46` (Esmeralda) | Conexão Social, Descanso de Agentes e Lounge | Orla Marítima, Pier Lounge |

---

## 4. O Catálogo de Empresas Canônicas (`CompanyRegistry`)

1. **Depósito Mais** (`deposito-mais`): Construção civil, logística de materiais, entregas regionais.
2. **iDrinks** (`idrinks`): E-commerce de bebidas e eventos, automação de pedidos.
3. **AI ENGINE** (`ai-engine`): Desenvolvimento do núcleo cognitivo do próprio Fênix OS.
4. **ZapAI CRM** (`zapai-crm`): Gestão de relacionamento multicanal via WhatsApp e IA.
5. **TrustPag** (`trustpag`): Gateway financeiro, liquidação segura e anti-fraude.
6. **Marketing Agency** (`marketing`): Campanhas autônomas, tráfego e geração de leads.
7. **Research Lab** (`research-lab`): Pesquisa de ponta em agentes autônomos e biologia molecular.
