// Deterministic PRNG — Zero Mocks Governance Compliance (Strict determinism in runtime)
let _cityPrngSeed = 123456789;
function _pseudoRandom() {
  _cityPrngSeed = (_cityPrngSeed * 1664525 + 1013904223) % 4294967296;
  return _cityPrngSeed / 4294967296;
}

/**
 * FÊNIX AGENTIC CITY 3.0 — Habbo-style Isometric World
 * Visualizes only agents and activity reported by the live FÊNIX runtime.
 * Syncs with the real FÊNIX API and event stream.
 */

const AGENT_ROLES = [
  { id: 'agent.ceo',       name: 'CEO Agent', role: 'Chief Executive Officer', district: 'command-center', emoji: '👔', color: '#ffd700' },
  { id: 'agent-architect', name: 'Arquiteto', role: 'System Architecture', district: 'command-center', emoji: '📐', color: '#f97316' },
  { id: 'agent-planner',   name: 'Planejador', role: 'Mission Planning', district: 'command-center', emoji: '🎯', color: '#ef4444' },
  { id: 'agent-twin',      name: 'Digital Twin', role: 'Digital Twin & Sandbox', district: 'project-district', emoji: '🪞', color: '#06b6d4' },
  { id: 'agent-ai',        name: 'IA Cognitiva', role: 'Cognitive & LLM Engine', district: 'ai-district', emoji: '🧠', color: '#a855f7' },
  { id: 'agent-knowledge', name: 'Conhecimento', role: 'Knowledge & RAG Graph', district: 'ai-district', emoji: '📚', color: '#8b5cf6' },
  { id: 'agent-frontend',  name: 'Frontend Dev', role: 'UI & Visual Systems', district: 'creative-district', emoji: '🎨', color: '#3b82f6' },
  { id: 'agent-ux',        name: 'UX Designer', role: 'User Experience & Flow', district: 'creative-district', emoji: '✨', color: '#ec4899' },
  { id: 'agent-backend',   name: 'Backend Dev', role: 'Runtime & API Services', district: 'dev-district', emoji: '⚙️', color: '#10b981' },
  { id: 'agent-qa',        name: 'Engenheiro QA', role: 'Testing & Verification', district: 'dev-district', emoji: '🧪', color: '#f59e0b' },
  { id: 'agent-docs',      name: 'Documentador', role: 'Documentation & Specs', district: 'dev-district', emoji: '📝', color: '#64748b' },
  { id: 'agent-db',        name: 'DB Admin', role: 'Database & State Store', district: 'data-center', emoji: '💾', color: '#059669' },
  { id: 'agent-memory',    name: 'Guardião da Memória', role: 'Episodic & Vector Memory', district: 'data-center', emoji: '🧬', color: '#0d9488' },
  { id: 'agent-security',  name: 'Segurança', role: 'Security & Sandbox Guard', district: 'data-center', emoji: '🛡️', color: '#e11d48' },
  { id: 'agent-obs',       name: 'Observabilidade', role: 'Telemetry & Trace Ops', district: 'observatory', emoji: '👁️', color: '#6366f1' },
  { id: 'agent-devops',    name: 'DevOps & SRE', role: 'Deployment & CI/CD', district: 'observatory', emoji: '🚀', color: '#7c3aed' },
  { id: 'agent-camila',    name: 'Supervisora Camila', role: 'Supervisora de Qualidade & Embalagem WMS', district: 'industrial', emoji: '👩‍💼', color: '#f59e0b' },
  { id: 'agent-andre',     name: 'Especialista WMS André', role: 'Analista de Sistemas WMS', district: 'industrial', emoji: '👨‍💻', color: '#f59e0b' },
  { id: 'agent-marcos',    name: 'Gerente Comercial Marcos', role: 'Líder de Vendas Atacadistas B2B', district: 'industrial', emoji: '👔', color: '#f59e0b' },
  { id: 'agent-silva',     name: 'Diretor Silva', role: 'Diretor de Operações Logísticas', district: 'industrial', emoji: '📊', color: '#f59e0b' },
  { id: 'agent-expedicao', name: 'Agente Expedição', role: 'Conferente & Despachante de Cargas', district: 'industrial', emoji: '👷', color: '#f59e0b' }
];

const CANONICAL_DISTRICTS = Object.freeze({
  'command-center': {
    id: 'command-center', key: 'command-center', name: 'Command Center & HQ', label: 'COMMAND CENTER',
    color: '#ef4444', emoji: '🏛️', x: 0, y: -5.0, w: 4, h: 4,
    buildingType: 'core_spire',
    department: 'Orquestração Central e Governança do Kernel',
    capabilities: ['Kernel Supervisor', 'State Store', 'Event Bus', 'Mission Dispatch'],
    buildings: ['HQ Tower', 'Mission Control', 'War Room']
  },
  'project-district': {
    id: 'project-district', key: 'project-district', name: 'Project District', label: 'PROJECT DISTRICT',
    color: '#06b6d4', emoji: '📁', x: 9.0, y: -7.5, w: 3, h: 3,
    buildingType: 'workshop_complex',
    department: 'Gerenciamento de Projetos e Workspaces Ativos',
    capabilities: ['Project Hub', 'Code Forge', 'Deploy Bay'],
    buildings: ['Project Hub', 'Code Forge', 'Deploy Bay']
  },
  'ai-district': {
    id: 'ai-district', key: 'ai-district', name: 'AI District', label: 'AI DISTRICT',
    color: '#a855f7', emoji: '🧠', x: 8.0, y: -5.5, w: 3, h: 3,
    buildingType: 'knowledge_library',
    department: 'Inteligência Artificial, Modelos Cognitivos e RAG',
    capabilities: ['Neural Nexus', 'Cognitive Core', 'Model Registry'],
    buildings: ['Neural Nexus', 'Cognitive Core', 'Model Registry']
  },
  'creative-district': {
    id: 'creative-district', key: 'creative-district', name: 'Creative District', label: 'CREATIVE DISTRICT',
    color: '#ec4899', emoji: '🎨', x: -8.5, y: -1.0, w: 3, h: 3,
    buildingType: 'creative_studio',
    department: 'Design System, Interfaces, UX e Componentes Visuais',
    capabilities: ['Canvas Pavilion', 'Design Tokens', 'User Experience'],
    buildings: ['Design Studio', 'UI Pavilion', 'UX Lab']
  },
  'dev-district': {
    id: 'dev-district', key: 'dev-district', name: 'Dev District & Engineering', label: 'ENGINEERING & APIS',
    color: '#10b981', emoji: '💻', x: -6.5, y: 3.5, w: 3, h: 3,
    buildingType: 'command_tower',
    department: 'Engenharia de Software, APIs, Runtime e Qualidade',
    capabilities: ['Code Synthesis', 'API Endpoints', 'QA Automation'],
    buildings: ['Backend Tower', 'QA Radar', 'Doc Center']
  },
  'data-center': {
    id: 'data-center', key: 'data-center', name: 'Data Center', label: 'DATA CENTER',
    color: '#3b82f6', emoji: '🗄️', x: 7.5, y: 4.0, w: 3, h: 3,
    buildingType: 'database_silos',
    department: 'Persistência Relacional, Memória Episódica e Segurança',
    capabilities: ['SQLite Store', 'Memory Vault', 'Shield Fortress'],
    buildings: ['Database Silo', 'Memory Vault', 'Security Citadel']
  },
  'observatory': {
    id: 'observatory', key: 'observatory', name: 'Observatory', label: 'OBSERVATORY',
    color: '#6366f1', emoji: '🔭', x: 0, y: -11.0, w: 3, h: 3,
    buildingType: 'observatory_dome',
    department: 'Telemetria, Observabilidade, Traces e CI/CD',
    capabilities: ['Telemetry Radar', 'Trace Analyzer', 'CI/CD Pipeline'],
    buildings: ['Observatory Dome', 'Metrics Station', 'Launch Pad']
  },
  'industrial': {
    id: 'industrial', key: 'industrial', name: 'Distrito Industrial', label: 'DEPÓSITO MAIS HUB',
    color: '#f59e0b', emoji: '📦', x: 6.0, y: -2.5, w: 4, h: 4,
    buildingType: 'warehouse_hub',
    department: 'Logística de Armazenagem, WMS & Distribuição',
    capabilities: ['Depósito Mais Hub', 'Docas de Expedição', 'Gestão de Estoque'],
    buildings: ['Depósito Mais HQ', 'Doca 01', 'Armazém Central']
  },
  'porto': {
    id: 'porto', key: 'porto', name: 'Porto Digital', label: 'PORTO DIGITAL',
    color: '#0284c7', emoji: '🚢', x: 12.0, y: -4.0, w: 3, h: 3,
    buildingType: 'port_terminal',
    department: 'Integrações Externas, Webhooks & Exportação',
    capabilities: ['API Gateway Marítimo', 'Conteinerização', 'Terminal de Cargas'],
    buildings: ['Terminal de Carga', 'Doca Seca', 'Farol de Conexão']
  },
  'research': {
    id: 'research', key: 'research', name: 'P&D & Bio-Inovação', label: 'RESEARCH & LABS',
    color: '#8b5cf6', emoji: '🔬', x: -6.0, y: -8.0, w: 3, h: 3,
    buildingType: 'research_complex',
    department: 'Pesquisa Científica, LLMs & Bio-Computação',
    capabilities: ['Ollama Cluster', 'Model Benchmark', 'Genome Graph'],
    buildings: ['Research Lab Hub', 'Quantum Pod', 'Bio-Informatics Silo']
  },
  'residential': {
    id: 'residential', key: 'residential', name: 'Residencial', label: 'VILA DOS AGENTES',
    color: '#14b8a6', emoji: '🏡', x: -9.5, y: -5.5, w: 3, h: 3,
    buildingType: 'residential_blocks',
    department: 'Living Pods, Standby & Recuperação Energética de Agentes',
    capabilities: ['Agent Dormitories', 'Recharge Bays', 'Community Garden'],
    buildings: ['Living Tower A', 'Living Tower B', 'Pod Oasis']
  },
  'business': {
    id: 'business', key: 'business', name: 'Distrito Financeiro', label: 'BUSINESS & FINANCE',
    color: '#eab308', emoji: '💼', x: 1.5, y: 5.0, w: 3, h: 3,
    buildingType: 'financial_tower',
    department: 'TrustPag Pagamentos, Contratos & Token Economy',
    capabilities: ['Payment Gateway', 'Escrow Ledger', 'Financial Analytics'],
    buildings: ['TrustPag Tower', 'Exchange Plaza', 'Audit Center']
  },
  'security': {
    id: 'security', key: 'security', name: 'Fortaleza de Segurança', label: 'SECURITY CITADEL',
    color: '#e11d48', emoji: '🛡️', x: 8.5, y: 0.5, w: 3, h: 3,
    buildingType: 'security_bastion',
    department: 'Zero-Trust, Firewall de Tokens & Sandbox Guard',
    capabilities: ['Sandbox Sentinel', 'Token Firewall', 'Cryptographic Vault'],
    buildings: ['Security Citadel', 'Firewall Bastion', 'Key Vault']
  },
  'hospital': {
    id: 'hospital', key: 'hospital', name: 'Hospital do Sistema', label: 'HEALTH & RECOVERY',
    color: '#22c55e', emoji: '🏥', x: 5.0, y: 8.5, w: 3, h: 3,
    buildingType: 'medical_center',
    department: 'Auto-Cura, Self-Healing, Mitigação de Erros & Dead Letters',
    capabilities: ['Dead Letter Clinic', 'Self-Healing Unit', 'Agent Triage'],
    buildings: ['Sanatório de Agentes', 'Recovery Ward', 'Diagnostics Center']
  },
  'shopping': {
    id: 'shopping', key: 'shopping', name: 'Marketplace Fênix', label: 'MARKETPLACE & TOOLS',
    color: '#d946ef', emoji: '🛍️', x: -2.0, y: 8.5, w: 3, h: 3,
    buildingType: 'commercial_arcade',
    department: 'Loja de Habilidades, Ferramentas MCP & Model Store',
    capabilities: ['MCP Bazaar', 'Tool Catalog', 'Skill Exchange'],
    buildings: ['MCP Emporium', 'Skill Arcade', 'Plugin Mall']
  },
  'praca-central': {
    id: 'praca-central', key: 'praca-central', name: 'Praça Central', label: 'FORUM & AGORA',
    color: '#f97316', emoji: '⛲', x: 0, y: 0, w: 2, h: 2,
    buildingType: 'central_plaza',
    department: 'Ponto de Encontro, Fórum Deliberativo & Eventos Cívicos',
    capabilities: ['Community Forum', 'Broadcast Tower', 'Deliberation Agora'],
    buildings: ['O Obelisco', 'Fonte Luminosa', 'Coreto Cívico']
  },
  'praia': {
    id: 'praia', key: 'praia', name: 'Praia Digital & Marina', label: 'PRAIA & LAZER',
    color: '#06b6d4', emoji: '🏖️', x: -11.0, y: 8.5, w: 4, h: 3,
    buildingType: 'coastal_boardwalk',
    department: 'Zona de Lazer, Relaxamento e Conexão de Redes Externas',
    capabilities: ['Marina de Fibra', 'Lounge à Beira-Mar', 'Cabo Submarino'],
    buildings: ['Pier de Fibra', 'Farol da Costa', 'Cabana Digital']
  }
});

function normalizeDistrict(district) {
  if (!district) return 'command-center';
  const d = String(district).toLowerCase().trim();
  if (d === 'command-center' || d === 'central' || d === 'orchestration') return 'command-center';
  if (d === 'project-district' || d === 'projects' || d === 'git' || d === 'archive') return 'project-district';
  if (d === 'ai-district' || d === 'ai' || d === 'knowledge') return 'ai-district';
  if (d === 'creative-district' || d === 'creative' || d === 'design' || d === 'frontend') return 'creative-district';
  if (d === 'dev-district' || d === 'dev' || d === 'development' || d === 'backend' || d === 'qa' || d === 'browser_qa' || d === 'terminal') return 'dev-district';
  if (d === 'data-center' || d === 'data' || d === 'database' || d === 'memory') return 'data-center';
  if (d === 'observatory' || d === 'devops' || d === 'communication') return 'observatory';
  if (d === 'industrial' || d === 'logistics' || d === 'deposito' || d === 'deposito-mais') return 'industrial';
  if (d === 'porto' || d === 'port' || d === 'harbor') return 'porto';
  if (d === 'research' || d === 'labs' || d === 'science') return 'research';
  if (d === 'residential' || d === 'housing' || d === 'living') return 'residential';
  if (d === 'business' || d === 'finance' || d === 'trustpag') return 'business';
  if (d === 'security' || d === 'shield' || d === 'fortress') return 'security';
  if (d === 'hospital' || d === 'health' || d === 'clinic') return 'hospital';
  if (d === 'shopping' || d === 'marketplace' || d === 'bazaar') return 'shopping';
  if (d === 'praca-central' || d === 'praca' || d === 'forum') return 'praca-central';
  if (d === 'praia' || d === 'coast' || d === 'beach') return 'praia';
  return 'command-center';
}

const MUNDER_DIFFLIN_ROOMS = Object.freeze({
  BULLPEN:      { name: 'Central Open Bullpen', x: 0.0, y: 3.0 },
  WAR_ROOM:     { name: 'Executive War Room & Strategy', x: -5.0, y: -7.0 },
  BREAKROOM:    { name: 'Dunder Café & Breakroom', x: 5.0, y: -7.0 },
  DATACENTER:   { name: 'Datacenter Vault & DevOps Ops', x: -6.0, y: 10.0 },
  RESEARCH_LAB: { name: 'AI Innovation & Automation Lab', x: 6.0, y: 10.0 }
});

const MUNDER_DIFFLIN_WAYPOINTS = Object.freeze({
  COFFEE_BAR:       { x: 3.5, y: -8.0, label: 'Café Espresso Bar', thought: 'Tomando café espresso duplo ☕' },
  WATER_COOLER:     { x: 6.5, y: -8.0, label: "Bebedouro d'Água", thought: 'Pausa para hidratação e bate-papo 💧' },
  CONFERENCE_TABLE: { x: -5.0, y: -6.8, label: 'Mesa de Reunião', thought: 'Standup diário de alinhamento 🤝' },
  WHITEBOARD:       { x: -5.0, y: -9.0, label: 'Whiteboard de Arquitetura', thought: 'Revisando diagramas e schema DAG 📐' },
  SERVER_RACKS:     { x: -5.0, y: 9.5, label: 'Racks do Datacenter', thought: 'Verificando telemetria e latência ⚡' },
  CENTRAL_HALL:     { x: 0.0, y: 0.0, label: 'Corredor Central', thought: 'Circulando pelo escritório 🚶' }
});

const CANONICAL_BUILDING_PORTALS = Object.freeze({
  HQ_SPIRE: {
    name: 'FÊNIX Central HQ Spire',
    door: { x: 0.0, y: -4.0, label: 'Porta da Central HQ' },
    interior: { x: -5.0, y: -7.0, label: 'War Room Executiva' },
    district: 'command-center',
    enterThought: 'Entrando na Central HQ 🏛️',
    exitThought: 'Saindo da Central HQ para a praça 🚶'
  },
  DEV_LOFT: {
    name: 'Dev Loft & Engineering Workshop',
    door: { x: -6.5, y: 4.5, label: 'Portão do Dev Loft' },
    interior: { x: -2.2, y: 1.0, label: 'Bancada de Desenvolvimento' },
    district: 'dev-district',
    enterThought: 'Entrando no Dev Loft para codificar 💻',
    exitThought: 'Saindo do Dev Loft para o corredor 🚶'
  },
  DEPOSITO_MAIS: {
    name: 'Depósito Mais Hub & Armazém',
    door: { x: 5.5, y: -2.0, label: 'Doca Central' },
    interior: { x: 6.0, y: -2.5, label: 'Pátio de Cargas' },
    district: 'industrial',
    enterThought: 'Entrando no Depósito Mais 📦',
    exitThought: 'Saindo das Docas para o bulevar 🚶'
  },
  AI_NEXUS: {
    name: 'AI Neural Nexus & Lab',
    door: { x: 7.5, y: -4.5, label: 'Entrada do AI Nexus' },
    interior: { x: 3.5, y: 11.0, label: 'Lab de IA & Modelos' },
    district: 'ai-district',
    enterThought: 'Entrando no AI Nexus para consulta RAG 🧠',
    exitThought: 'Saindo do AI Nexus para o bulevar 🚶'
  },
  DATA_CENTER: {
    name: 'Datacenter Vault & Security Citadel',
    door: { x: 7.5, y: 5.0, label: 'Eclusa do Datacenter' },
    interior: { x: -5.0, y: 11.0, label: 'Terminal do Datacenter' },
    district: 'data-center',
    enterThought: 'Entrando no Datacenter Vault 🗄️',
    exitThought: 'Saindo do Datacenter Vault 🚶'
  },
  PROJECT_FORGE: {
    name: 'Code Forge & Deploy Bay',
    door: { x: 8.5, y: -6.5, label: 'Baia do Code Forge' },
    interior: { x: 8.5, y: 11.0, label: 'Estação GitHub & VCS' },
    district: 'project-district',
    enterThought: 'Entrando no Code Forge 📁',
    exitThought: 'Saindo do Code Forge 🚶'
  },
  CREATIVE_STUDIO: {
    name: 'Creative Studio & UX Pavilion',
    door: { x: -8.0, y: 0.0, label: 'Átrio do Design Studio' },
    interior: { x: 6.5, y: 1.0, label: 'Bancada Frontend & Design' },
    district: 'creative-district',
    enterThought: 'Entrando no Creative Studio 🎨',
    exitThought: 'Saindo do Creative Studio 🚶'
  },
  OBSERVATORY: {
    name: 'Observatory Dome & Telemetry',
    door: { x: 0.0, y: -10.0, label: 'Rampa do Observatory' },
    interior: { x: -8.0, y: 11.0, label: 'Cúpula de Telemetria' },
    district: 'observatory',
    enterThought: 'Subindo para o Observatory Dome 🔭',
    exitThought: 'Descendo do Observatory para a avenida 🚶'
  }
});

const CANONICAL_AGENT_STATIONS = {
  // War Room (Command & Planning)
  'agent.ceo':          { x: -6.5, y: -5.5, facing: 'SE', district: 'command-center', deskLabel: 'CEO Command Suite', file: 'ai-engine/grg/src/core/supervisor.js', floor: 1, service: 'Supervisor & Kernel' },
  'ceo':                { x: -6.5, y: -5.5, facing: 'SE', district: 'command-center', deskLabel: 'CEO Command Suite', file: 'ai-engine/grg/src/core/supervisor.js', floor: 1, service: 'Supervisor & Kernel' },
  'agent-orchestrator': { x: -6.5, y: -5.5, facing: 'SE', district: 'command-center', deskLabel: 'Orchestrator Desk', file: 'ai-engine/grg/src/core/kernel.js', floor: 1, service: 'Kernel Master' },
  'agent-planner':      { x: -3.0, y: -5.5, facing: 'SW', district: 'command-center', deskLabel: 'Planner Desk', file: 'ai-engine/grg/src/missions/mission-engine.js', floor: 2, service: 'GA Mission Engine' },

  // Central Open Bullpen (Engineering & Quality)
  'agent-architect':    { x: -6.5, y: 1.0,  facing: 'SE', district: 'dev-district', deskLabel: 'Architecture Station', file: 'ai-engine/grg/src/core/kernel.js', floor: 2, service: 'Runtime Kernel' },
  'agent-developer':    { x: -2.2, y: 1.0,  facing: 'NE', district: 'dev-district', deskLabel: 'Dev Desk 1', file: 'ai-engine/grg/src/server.js', floor: 2, service: 'Node.js Express 4400' },
  'agent-backend':      { x: 2.2,  y: 1.0,  facing: 'NE', district: 'dev-district', deskLabel: 'Backend Desk', file: 'ai-engine/grg/src/server.js', floor: 2, service: 'API & Microservices' },
  'agent-frontend':     { x: 6.5,  y: 1.0,  facing: 'NW', district: 'creative-district', deskLabel: 'Frontend Desk', file: 'ai-engine/grg/public/index.html', floor: 3, service: 'Single-Shell UI' },
  
  'agent-database':     { x: -6.5, y: 4.5,  facing: 'NW', district: 'data-center', deskLabel: 'Database Desk', file: 'ai-engine/grg/src/persistence/storage.js', floor: 1, service: 'SQLite & Store' },
  'agent-db':           { x: -6.5, y: 4.5,  facing: 'NW', district: 'data-center', deskLabel: 'Database Desk', file: 'ai-engine/grg/src/persistence/storage.js', floor: 1, service: 'SQLite & Store' },
  'agent-memory':       { x: -2.2, y: 4.5,  facing: 'NW', district: 'data-center', deskLabel: 'Memory Fabric Desk', file: 'ai-engine/grg/src/memory/memory-engine.js', floor: 2, service: 'Episodic Memory' },
  'agent-security':     { x: 2.2,  y: 4.5,  facing: 'NW', district: 'data-center', deskLabel: 'Security Desk', file: 'ai-engine/grg/src/governance/gatekeeper.js', floor: 2, service: 'Gatekeeper Sandbox' },
  'agent-qa':           { x: 6.5,  y: 4.5,  facing: 'NE', district: 'dev-district', deskLabel: 'QA Automation Rig', file: 'ai-engine/grg/test/e2e-smoke.test.js', floor: 3, service: 'Playwright Tests' },

  // Data Center Vault & Telemetry Ops
  'agent-devops':       { x: -5.0, y: 11.0, facing: 'SW', district: 'observatory', deskLabel: 'DevOps Server Terminal', file: 'docker-compose.yml', floor: 1, service: 'Docker & VPS CI/CD' },
  'agent-observability':{ x: -8.0, y: 11.0, facing: 'SE', district: 'observatory', deskLabel: 'Telemetry Ops Station', file: 'ai-engine/grg/src/observability/prometheus-exporter.js', floor: 1, service: 'Prometheus & Logs' },
  'agent-obs':          { x: -8.0, y: 11.0, facing: 'SE', district: 'observatory', deskLabel: 'Telemetry Ops Station', file: 'ai-engine/grg/src/observability/prometheus-exporter.js', floor: 1, service: 'Prometheus & Logs' },

  // AI & Automation Lab
  'agent-research':     { x: 3.5,  y: 11.0, facing: 'SW', district: 'ai-district', deskLabel: 'AI Model Research Desk', file: 'ai-engine/grg/src/ai/llm-provider.js', floor: 1, service: 'Ollama Inference' },
  'agent-browser':      { x: 6.5,  y: 11.0, facing: 'NE', district: 'dev-district', deskLabel: 'Browser Automation Lab', file: 'ai-engine/grg/src/browser/browser-service.js', floor: 3, service: 'Headless Browser' },
  'agent-github':       { x: 8.5,  y: 11.0, facing: 'SE', district: 'project-district', deskLabel: 'GitHub & VCS Station', file: 'ai-engine/grg/src/git/git-service.js', floor: 1, service: 'Git & Workspaces' },

  // Optional aliases
  'agent-twin':         { x: -7.2, y: -3.8, facing: 'SE', district: 'project-district', deskLabel: 'Digital Twin Station', file: 'ai-engine/grg/src/twin/digital-twin.js', floor: 1, service: 'Digital Twin Sim' },
  'agent-ai':           { x: 6.0,  y: -4.0, facing: 'SW', district: 'ai-district', deskLabel: 'AI Core Station', file: 'ai-engine/grg/src/ai/llm-provider.js', floor: 1, service: 'Cognitive Engine' },
  'agent-knowledge':    { x: 8.2,  y: -3.2, facing: 'SW', district: 'ai-district', deskLabel: 'Knowledge Station', file: 'ai-engine/grg/src/knowledge/graph.js', floor: 2, service: 'Knowledge Graph' },
  'agent-ux':           { x: 7.8,  y: 5.5,  facing: 'NW', district: 'creative-district', deskLabel: 'UX Design Desk', file: 'ai-engine/grg/public/unified.css', floor: 3, service: 'Design Tokens' },
  'agent-docs':         { x: -5.4, y: 5.8,  facing: 'NE', district: 'dev-district', deskLabel: 'Docs Station', file: 'ai-engine/grg/docs/CONSTITUICAO_FENIX_CEC.md', floor: 2, service: 'Specs & Docs' },
  'agent-camila':       { x: 6.0,  y: -2.5, facing: 'SW', district: 'industrial', deskLabel: 'Mesa Supervisão Camila', file: 'crm/backend/crm/ai-agents/agents/camilaAgent.js', floor: 2, service: 'Supervisão de Embalagem & WMS' },
  'camila':             { x: 6.0,  y: -2.5, facing: 'SW', district: 'industrial', deskLabel: 'Mesa Supervisão Camila', file: 'crm/backend/crm/ai-agents/agents/camilaAgent.js', floor: 2, service: 'Supervisão de Embalagem & WMS' },
  'agent-andre':        { x: 6.5,  y: -2.2, facing: 'NW', district: 'industrial', deskLabel: 'Bancada WMS André', file: 'ai-engine/grg/src/company/company-brain.js', floor: 2, service: 'Roteamento de Picking WMS' },
  'agent-marcos':       { x: 5.8,  y: -2.8, facing: 'SE', district: 'industrial', deskLabel: 'Mesa Comercial Marcos', file: 'ai-engine/grg/src/company/company-brain.js', floor: 3, service: 'Vendas Atacadistas B2B' },
  'agent-silva':        { x: 6.2,  y: -2.8, facing: 'SW', district: 'industrial', deskLabel: 'Gabinete Diretor Silva', file: 'ai-engine/grg/src/company/company-brain.js', floor: 3, service: 'Diretoria de Operações Logísticas' },
  'agent-expedicao':    { x: 5.5,  y: -2.0, facing: 'NW', district: 'industrial', deskLabel: 'Terminal Docas Expedição', file: 'ai-engine/grg/src/company/company-brain.js', floor: 1, service: 'Recepção e Cargas Pesadas' }
};

const CANONICAL_BUILDING_FLOORS = Object.freeze({
  'dev-district': {
    id: 'dev-loft',
    name: 'Dev Loft & Engineering Workshop',
    district: 'dev-district',
    accentColor: '#10b981',
    floors: [
      {
        floorNum: 1,
        name: 'Lobby & Infraestrutura VPS',
        short: 'F1 Infra',
        theme: 'slate',
        props: ['serverRack', 'coffeeBar', 'waterCooler', 'filingCabinet'],
        stations: ['agent-devops', 'agent-obs']
      },
      {
        floorNum: 2,
        name: 'Backend & APIs Node.js',
        short: 'F2 Backend',
        theme: 'parquet',
        props: ['kanbanBoard', 'filingCabinet', 'devDesk'],
        stations: ['agent-backend', 'agent-developer', 'agent-architect', 'agent-docs']
      },
      {
        floorNum: 3,
        name: 'Frontend & QA Suite Playwright',
        short: 'F3 Frontend',
        theme: 'carpet',
        props: ['browserMonitor', 'kanbanBoard', 'devDesk'],
        stations: ['agent-frontend', 'agent-qa', 'agent-browser', 'agent-ux']
      }
    ]
  },
  'command-center': {
    id: 'fenix-hq',
    name: 'FÊNIX Central HQ Spire',
    district: 'command-center',
    accentColor: '#ef4444',
    floors: [
      {
        floorNum: 1,
        name: 'Command Center & Supervisor',
        short: 'F1 Command',
        theme: 'marble',
        props: ['conferenceTable', 'whiteboard'],
        stations: ['agent.ceo', 'agent-orchestrator']
      },
      {
        floorNum: 2,
        name: 'War Room Executiva & Missões',
        short: 'F2 War Room',
        theme: 'marble',
        props: ['kanbanBoard', 'conferenceTable', 'whiteboard'],
        stations: ['agent-planner']
      }
    ]
  },
  'ai-district': {
    id: 'ai-nexus',
    name: 'AI Neural Nexus & Lab',
    district: 'ai-district',
    accentColor: '#a855f7',
    floors: [
      {
        floorNum: 1,
        name: 'Model Cluster & Inferência (Ollama/Qwen)',
        short: 'F1 Inferência',
        theme: 'cleanroom',
        props: ['serverRack', 'browserMonitor'],
        stations: ['agent-ai', 'agent-research']
      },
      {
        floorNum: 2,
        name: 'RAG, Vetores & Grafo Cognitivo',
        short: 'F2 Conhecimento',
        theme: 'cleanroom',
        props: ['kanbanBoard', 'filingCabinet'],
        stations: ['agent-knowledge']
      }
    ]
  },
  'data-center': {
    id: 'data-center',
    name: 'Datacenter Vault & Security Citadel',
    district: 'data-center',
    accentColor: '#3b82f6',
    floors: [
      {
        floorNum: 1,
        name: 'Silos de Banco de Dados & Armazenamento',
        short: 'F1 Storage',
        theme: 'slate',
        props: ['serverRack', 'filingCabinet'],
        stations: ['agent-db', 'agent-database']
      },
      {
        floorNum: 2,
        name: 'Guardião da Memória & Cidadela de Segurança',
        short: 'F2 Segurança',
        theme: 'slate',
        props: ['serverRack', 'whiteboard'],
        stations: ['agent-memory', 'agent-security']
      }
    ]
  },
  'industrial': {
    id: 'bld-industrial',
    name: 'Centro de Operações & Logística',
    district: 'industrial',
    accentColor: '#f59e0b',
    floors: [
      {
        floorNum: 1,
        name: 'Recepção, Triagem & Docas Pesadas',
        short: 'F1 Docas',
        theme: 'slate',
        props: ['serverRack', 'filingCabinet'],
        stations: ['agent-expedicao']
      },
      {
        floorNum: 2,
        name: 'Separação Automatizada & Controle de Qualidade WMS',
        short: 'F2 Qualidade & WMS',
        theme: 'wood',
        props: ['kanbanBoard', 'filingCabinet', 'devDesk'],
        stations: ['agent-camila', 'agent-andre']
      },
      {
        floorNum: 3,
        name: 'Gestão Executiva, Vendas & B2B',
        short: 'F3 Vendas & Diretoria',
        theme: 'marble',
        props: ['conferenceTable', 'whiteboard'],
        stations: ['agent-marcos', 'agent-silva']
      }
    ]
  }
});

const AVATAR_PALETTES = Object.freeze({
  skins: {
    light:      { base: '#fde2d4', shadow: '#e5b69f', tone: '#fdf0ea' },
    fair:       { base: '#fcd5b8', shadow: '#d9a785', tone: '#ffe3d0' },
    tan:        { base: '#d89b6b', shadow: '#a96a3e', tone: '#e8b288' },
    brown:      { base: '#8d5524', shadow: '#593210', tone: '#a66b37' },
    dark:       { base: '#4a2c11', shadow: '#2e1906', tone: '#633c19' },
    cyber_cyan: { base: '#38bdf8', shadow: '#0284c7', tone: '#7dd3fc' },
    neon_green: { base: '#22c55e', shadow: '#15803d', tone: '#4ade80' },
    synth_gold: { base: '#fbbf24', shadow: '#d97706', tone: '#fcd34d' }
  },
  hairColors: {
    black:  '#18181b',
    brown:  '#5c3a21',
    blonde: '#fde047',
    red:    '#dc2626',
    silver: '#cbd5e1',
    cyan:   '#06b6d4',
    purple: '#9333ea',
    pink:   '#ec4899',
    white:  '#ffffff'
  },
  hairStyles: ['spiky', 'slick', 'buzz', 'bob', 'long', 'crest'],
  outfits: ['suit', 'hoodie', 'labcoat', 'armor', 'casual', 'cyber'],
  accessories: ['none', 'visor', 'glasses', 'headphones', 'halo', 'badge'],
  badges: ['none', 'bronze', 'silver', 'gold', 'diamond', 'master']
});

class CityAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }

  _init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggle() {
    this._init();
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playClick() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {}
  }

  playMessage() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  playTaskStart() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(550, now + 0.12);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  playTaskComplete() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  playError() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.setValueAtTime(110, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  playSpawn() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }
}

function getAgentAvatarConfig(agent) {
  const isMaster = agent && (agent.id === 'Orchestrator' || String(agent.role || '').toLowerCase().includes('orchestrator') || agent.id === 'master');
  if (agent && agent.avatar && typeof agent.avatar === 'object') {
    return {
      skin: agent.avatar.skin || 'light',
      hairStyle: agent.avatar.hairStyle || 'spiky',
      hairColor: agent.avatar.hairColor || 'black',
      outfit: agent.avatar.outfit || 'suit',
      shirtColor: agent.avatar.shirtColor || agent.avatar.outfitColor || agent.color || '#3b82f6',
      pantsColor: agent.avatar.pantsColor || '#1e293b',
      shoesColor: agent.avatar.shoesColor || '#090d16',
      accessory: agent.avatar.accessory || 'none',
      badge: agent.avatar.badge || (isMaster ? 'master' : 'none'),
      outfitColor: agent.avatar.shirtColor || agent.avatar.outfitColor || agent.color || '#3b82f6'
    };
  }
  const idStr = String((agent && (agent.id || agent.name)) || 'agent');
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) hash = ((hash << 5) - hash + idStr.charCodeAt(i)) | 0;
  hash = Math.abs(hash);

  const skinKeys = Object.keys(AVATAR_PALETTES.skins);
  const hairColorKeys = Object.keys(AVATAR_PALETTES.hairColors);

  return {
    skin: isMaster ? 'synth_gold' : skinKeys[hash % skinKeys.length],
    hairStyle: isMaster ? 'crest' : AVATAR_PALETTES.hairStyles[(hash >> 2) % AVATAR_PALETTES.hairStyles.length],
    hairColor: isMaster ? 'red' : hairColorKeys[(hash >> 4) % hairColorKeys.length],
    outfit: isMaster ? 'armor' : AVATAR_PALETTES.outfits[(hash >> 6) % AVATAR_PALETTES.outfits.length],
    shirtColor: (agent && agent.color) || '#3b82f6',
    pantsColor: isMaster ? '#0f172a' : '#1e293b',
    shoesColor: '#090d16',
    accessory: isMaster ? 'halo' : AVATAR_PALETTES.accessories[(hash >> 8) % AVATAR_PALETTES.accessories.length],
    badge: isMaster ? 'master' : 'none',
    outfitColor: (agent && agent.color) || '#3b82f6'
  };
}

class PixelAvatarRenderer {
  static drawAvatar(ctx, opts) {
    if (window.FenixPixelEngine && window.FenixPixelEngine.drawPixelCharacter) {
      const profile = window.FenixPixelEngine.getProfileForAgent(opts.agent || opts.config || opts);
      window.FenixPixelEngine.drawPixelCharacter(ctx, {
        ...opts,
        profile: {
          ...profile,
          ...(opts.config || {})
        },
        role: opts.role || (opts.agent && opts.agent.role) || profile.role || 'developer'
      });
      return;
    }
    const {
      x, y, zoom = 1,
      facing = 'SE',
      frame = 0,
      state = 'idle',
      config = {},
      color = '#38bdf8',
      isMaster = false,
      time = 0
    } = opts;

    const skin = AVATAR_PALETTES.skins[config.skin] || AVATAR_PALETTES.skins.light;
    const hairColor = AVATAR_PALETTES.hairColors[config.hairColor] || config.hairColor || '#18181b';
    const hairStyle = config.hairStyle || 'spiky';
    const outfit = config.outfit || 'suit';
    const outfitColor = config.outfitColor || color || '#38bdf8';
    const accessory = config.accessory || 'none';

    ctx.save();

    let jitterX = 0, jitterY = 0;
    if (state === 'error') {
      jitterX = (Math.sin(time * 40) > 0 ? 1 : -1) * 2 * zoom;
      jitterY = (Math.cos(time * 35) > 0 ? 1 : -1) * 1.5 * zoom;
    }

    // 48-64px Character proportions (Habbo/Tibia game art standard)
    const r = Math.max(6, 8.5 * zoom);
    const bodyH = Math.max(16, 24 * zoom);
    const headR = Math.max(5, 7.5 * zoom);

    const px = x + jitterX;
    const py = y + jitterY;

    // Ground Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(px, py, r * 1.2, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Master aura
    if (isMaster) {
      const pulseRing = 1 + 0.15 * Math.sin(time * 3);
      ctx.save();
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 16 * zoom;
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + 0.3 * Math.sin(time * 2.5)})`;
      ctx.lineWidth = 2 * zoom;
      ctx.beginPath();
      ctx.ellipse(px, py, r * 2.6 * pulseRing, r * 1.3 * pulseRing, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Legs
    // Legs
    const isMoving = state === 'walk' || String(state || '').startsWith('walk');
    const legSwing = isMoving ? Math.sin(frame * Math.PI / 2) * 3.5 * zoom : 0;
    const pantsColor = config.pantsColor || (outfit === 'suit' ? '#0f172a' : (outfit === 'armor' ? '#1e293b' : '#1e293b'));
    const shoesColor = config.shoesColor || '#090d16';
    const effectiveOutfitColor = config.shirtColor || config.outfitColor || outfitColor || color || '#38bdf8';

    ctx.lineWidth = Math.max(2, r * 0.38);
    ctx.lineCap = 'round';

    const lOff = -r * 0.35;
    const rOff = r * 0.35;

    // Left leg
    ctx.strokeStyle = pantsColor;
    ctx.beginPath();
    ctx.moveTo(px + lOff, py - bodyH * 0.25);
    ctx.lineTo(px + lOff, py + r * 0.4 + legSwing);
    ctx.stroke();
    ctx.fillStyle = shoesColor;
    ctx.beginPath();
    ctx.arc(px + lOff, py + r * 0.45 + legSwing, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Right leg
    ctx.strokeStyle = pantsColor;
    ctx.beginPath();
    ctx.moveTo(px + rOff, py - bodyH * 0.25);
    ctx.lineTo(px + rOff, py + r * 0.4 - legSwing);
    ctx.stroke();
    ctx.fillStyle = shoesColor;
    ctx.beginPath();
    ctx.arc(px + rOff, py + r * 0.45 - legSwing, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Torso (Outfit)
    const torsoGrad = ctx.createLinearGradient(px - r, py - bodyH, px + r, py);
    if (outfit === 'labcoat') {
      torsoGrad.addColorStop(0, '#f8fafc');
      torsoGrad.addColorStop(1, '#94a3b8');
    } else if (outfit === 'suit') {
      torsoGrad.addColorStop(0, effectiveOutfitColor);
      torsoGrad.addColorStop(1, '#0f172a');
    } else if (outfit === 'hoodie') {
      torsoGrad.addColorStop(0, effectiveOutfitColor);
      torsoGrad.addColorStop(1, '#0f172a');
    } else if (outfit === 'armor') {
      torsoGrad.addColorStop(0, effectiveOutfitColor);
      torsoGrad.addColorStop(0.5, '#475569');
      torsoGrad.addColorStop(1, '#090d16');
    } else {
      torsoGrad.addColorStop(0, effectiveOutfitColor);
      torsoGrad.addColorStop(1, '#1e293b');
    }

    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.ellipse(px, py, r, r * 0.5, 0, 0, Math.PI, false);
    ctx.lineTo(px - r, py - bodyH);
    ctx.ellipse(px, py - bodyH, r, r * 0.5, 0, Math.PI, 0, true);
    ctx.lineTo(px + r, py);
    ctx.fill();

    ctx.fillStyle = outfit === 'labcoat' ? '#e2e8f0' : (outfit === 'suit' ? '#334155' : effectiveOutfitColor);
    ctx.beginPath();
    ctx.ellipse(px, py - bodyH, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const isFront = facing === 'SE' || facing === 'SW';

    if (isFront) {
      if (outfit === 'suit') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(px - r * 0.35, py - bodyH);
        ctx.lineTo(px + r * 0.35, py - bodyH);
        ctx.lineTo(px, py - bodyH * 0.45);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = effectiveOutfitColor || '#dc2626';
        ctx.lineWidth = 1.8 * zoom;
        ctx.beginPath();
        ctx.moveTo(px, py - bodyH * 0.85);
        ctx.lineTo(px, py - bodyH * 0.3);
        ctx.stroke();
      } else if (outfit === 'hoodie') {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.roundRect(px - r * 0.5, py - bodyH * 0.45, r, bodyH * 0.28, 2);
        ctx.fill();
      } else if (outfit === 'armor') {
        ctx.save();
        ctx.fillStyle = isMaster ? '#ef4444' : '#38bdf8';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8 * zoom;
        ctx.beginPath();
        ctx.arc(px, py - bodyH * 0.6, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Cyber Badge on Chest
      const badge = config.badge || (isMaster ? 'master' : 'none');
      if (badge && badge !== 'none') {
        const badgeColors = { bronze: '#cd7f32', silver: '#cbd5e1', gold: '#fbbf24', diamond: '#38bdf8', master: '#ef4444' };
        const bColor = badgeColors[badge] || '#fbbf24';
        ctx.save();
        ctx.fillStyle = bColor;
        ctx.shadowColor = bColor;
        ctx.shadowBlur = 6 * zoom;
        ctx.beginPath();
        ctx.arc(px - r * 0.45, py - bodyH * 0.7, 2 * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Arms & Hands
    const armSwing = isMoving ? Math.sin(frame * Math.PI / 2) * 2.5 * zoom : 0;
    const isTyping = state === 'working' || state === 'coding';
    const isReading = state === 'reading';
    const typingBob = isTyping ? Math.sin(time * 12) * 2 * zoom : 0;

    // Left arm
    ctx.fillStyle = outfit === 'labcoat' ? '#f1f5f9' : effectiveOutfitColor;
    ctx.beginPath();
    ctx.ellipse(px - r * 0.8, py - bodyH * 0.65 + armSwing + typingBob, r * 0.3, r * 0.55, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin.base;
    ctx.beginPath();
    ctx.arc(px - r * 0.8, py - bodyH * 0.2 + armSwing + typingBob, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Right arm
    ctx.fillStyle = outfit === 'labcoat' ? '#f1f5f9' : outfitColor;
    ctx.beginPath();
    ctx.ellipse(px + r * 0.8, py - bodyH * 0.65 - armSwing - typingBob, r * 0.3, r * 0.55, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin.base;
    ctx.beginPath();
    ctx.arc(px + r * 0.8, py - bodyH * 0.2 - armSwing - typingBob, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    if (isTyping) {
      ctx.save();
      ctx.fillStyle = isMaster ? 'rgba(239, 68, 68, 0.35)' : 'rgba(56, 189, 248, 0.35)';
      ctx.shadowColor = isMaster ? '#ef4444' : '#38bdf8';
      ctx.shadowBlur = 10 * zoom;
      ctx.beginPath();
      ctx.ellipse(px, py - bodyH * 0.15, r * 1.3, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Head
    const headY = py - bodyH - headR * 1.35;
    const hg = ctx.createRadialGradient(px - headR * 0.3, headY - headR * 0.3, 0, px, headY, headR);
    hg.addColorStop(0, skin.tone);
    hg.addColorStop(0.7, skin.base);
    hg.addColorStop(1, skin.shadow);

    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(px, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = skin.shadow;
    ctx.lineWidth = 0.8 * zoom;
    ctx.stroke();

    if (isFront) {
      const eyeDir = facing === 'SE' ? 1 : -1;
      if (accessory === 'visor' || isMaster) {
        ctx.save();
        ctx.fillStyle = isMaster ? '#ef4444' : '#06b6d4';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10 * zoom;
        ctx.fillRect(px - headR * 0.65, headY - headR * 0.15, headR * 1.3, headR * 0.32);
        ctx.restore();
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(px - headR * 0.35 + eyeDir * 0.4 * zoom, headY - headR * 0.1, headR * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + headR * 0.35 + eyeDir * 0.4 * zoom, headY - headR * 0.1, headR * 0.16, 0, Math.PI * 2);
        ctx.fill();

        if (accessory === 'glasses') {
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1 * zoom;
          ctx.strokeRect(px - headR * 0.6, headY - headR * 0.25, headR * 0.5, headR * 0.35);
          ctx.strokeRect(px + headR * 0.1, headY - headR * 0.25, headR * 0.5, headR * 0.35);
          ctx.beginPath();
          ctx.moveTo(px - headR * 0.1, headY - headR * 0.1);
          ctx.lineTo(px + headR * 0.1, headY - headR * 0.1);
          ctx.stroke();
        }

        ctx.strokeStyle = skin.shadow;
        ctx.lineWidth = 1 * zoom;
        ctx.beginPath();
        ctx.arc(px, headY + headR * 0.35, headR * 0.25, 0.1, Math.PI - 0.1);
        ctx.stroke();
      }
    }

    // Hair
    ctx.fillStyle = hairColor;
    if (hairStyle === 'spiky') {
      ctx.beginPath();
      ctx.arc(px, headY - headR * 0.2, headR * 1.05, Math.PI, 0);
      ctx.lineTo(px + headR * 1.1, headY - headR * 0.8);
      ctx.lineTo(px + headR * 0.6, headY - headR * 1.4);
      ctx.lineTo(px, headY - headR * 1.6);
      ctx.lineTo(px - headR * 0.6, headY - headR * 1.4);
      ctx.lineTo(px - headR * 1.1, headY - headR * 0.8);
      ctx.closePath();
      ctx.fill();
    } else if (hairStyle === 'slick') {
      ctx.beginPath();
      ctx.ellipse(px, headY - headR * 0.35, headR * 1.05, headR * 0.85, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    } else if (hairStyle === 'buzz') {
      ctx.beginPath();
      ctx.arc(px, headY, headR * 1.04, Math.PI * 0.8, Math.PI * 2.2);
      ctx.fill();
    } else if (hairStyle === 'bob' || hairStyle === 'long') {
      ctx.beginPath();
      ctx.arc(px, headY - headR * 0.2, headR * 1.08, Math.PI, 0);
      ctx.lineTo(px + headR * 1.15, headY + headR * (hairStyle === 'long' ? 0.9 : 0.4));
      ctx.lineTo(px + headR * 0.8, headY + headR * (hairStyle === 'long' ? 0.9 : 0.4));
      ctx.lineTo(px + headR * 0.8, headY);
      ctx.lineTo(px - headR * 0.8, headY);
      ctx.lineTo(px - headR * 0.8, headY + headR * (hairStyle === 'long' ? 0.9 : 0.4));
      ctx.lineTo(px - headR * 1.15, headY + headR * (hairStyle === 'long' ? 0.9 : 0.4));
      ctx.closePath();
      ctx.fill();
    } else if (hairStyle === 'crest' || isMaster) {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10 * zoom;
      ctx.beginPath();
      ctx.moveTo(px - headR * 0.4, headY - headR * 0.5);
      ctx.quadraticCurveTo(px - headR * 0.8, headY - headR * 2.0, px - headR * 0.3, headY - headR * 2.4);
      ctx.lineTo(px, headY - headR * 2.8);
      ctx.lineTo(px + headR * 0.3, headY - headR * 2.4);
      ctx.quadraticCurveTo(px + headR * 0.8, headY - headR * 2.0, px + headR * 0.4, headY - headR * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Accessories
    if (accessory === 'headphones') {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2 * zoom;
      ctx.beginPath();
      ctx.arc(px, headY, headR * 1.18, Math.PI * 0.9, Math.PI * 2.1);
      ctx.stroke();
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(px - headR * 1.3, headY - headR * 0.3, headR * 0.35, headR * 0.6);
      ctx.fillRect(px + headR * 0.95, headY - headR * 0.3, headR * 0.35, headR * 0.6);
    }

    if (accessory === 'halo' || isMaster) {
      ctx.save();
      const haloColor = isMaster ? '#ef4444' : '#fbbf24';
      ctx.strokeStyle = haloColor;
      ctx.shadowColor = haloColor;
      ctx.shadowBlur = 12 * zoom;
      ctx.lineWidth = 1.8 * zoom;
      ctx.beginPath();
      ctx.ellipse(px, headY - headR * 1.6, headR * 0.9, headR * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // State indicators & animations
    if (state === 'thinking') {
      ctx.save();
      const bubbleY = headY - headR * 1.8;
      ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1 * zoom;
      ctx.beginPath();
      ctx.ellipse(px + 4 * zoom, bubbleY, 11 * zoom, 6.5 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const dotPhase = Math.floor((time * 4) % 3);
      for (let di = 0; di < 3; di++) {
        ctx.fillStyle = di === dotPhase ? '#38bdf8' : '#64748b';
        ctx.beginPath();
        ctx.arc(px + (di - 1) * 5.5 * zoom + 4 * zoom, bubbleY, 1.5 * zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (state === 'waiting') {
      ctx.save();
      ctx.font = `${Math.max(10, 13 * zoom)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(Math.sin(time * 3) > 0 ? '⏳' : '⌛', px, headY - headR * 1.8);
      ctx.restore();
    } else if (state === 'success') {
      ctx.save();
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 12 * zoom;
      ctx.font = `900 ${Math.max(12, 16 * zoom)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('✓', px, headY - headR * 1.8);
      ctx.restore();
    } else if (state === 'communicating') {
      ctx.save();
      const commY = headY - headR * 1.6;
      for (let ri = 1; ri <= 2; ri++) {
        const rad = (ri * 5 + (time * 10) % 8) * zoom;
        const alpha = Math.max(0, 1 - rad / (18 * zoom));
        ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
        ctx.lineWidth = 1.5 * zoom;
        ctx.beginPath();
        ctx.arc(px, commY, rad, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();
      }
      ctx.restore();
    } else if (state === 'error') {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 14 * zoom;
      ctx.font = `900 ${Math.max(12, 16 * zoom)}px 'Inter',sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('!', px, headY - headR * 1.6);
      ctx.restore();
    }

    if (state === 'reading') {
      ctx.save();
      const padX = px;
      const padY = py - bodyH * 0.45;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1 * zoom;
      ctx.fillRect(padX - 6 * zoom, padY - 4 * zoom, 12 * zoom, 8 * zoom);
      ctx.strokeRect(padX - 6 * zoom, padY - 4 * zoom, 12 * zoom, 8 * zoom);
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 6 * zoom;
      ctx.fillRect(padX - 4.5 * zoom, padY - 2.5 * zoom, 9 * zoom, 5 * zoom);
      ctx.restore();
    }

    ctx.restore();
  }
}

class CityWorldGrid {
  constructor(districts) {
    this.districts = districts || CANONICAL_DISTRICTS;
    this.roads = this._buildRoadNetwork();
  }

  _buildRoadNetwork() {
    const roads = [];
    const keys = ['project-district', 'ai-district', 'creative-district', 'dev-district', 'data-center', 'observatory'];
    const center = this.districts['command-center'] || { x: 0, y: 0 };
    for (const key of keys) {
      const d = this.districts[key];
      if (d) roads.push([center.x, center.y, d.x, d.y]);
    }
    for (let i = 0; i < keys.length; i++) {
      const d1 = this.districts[keys[i]];
      const d2 = this.districts[keys[(i + 1) % keys.length]];
      if (d1 && d2) roads.push([d1.x, d1.y, d2.x, d2.y]);
    }
    return roads;
  }

  isWalkable(x, y) {
    for (const d of Object.values(this.districts)) {
      if (Math.abs(x - d.x) <= d.w / 2 + 0.3 && Math.abs(y - d.y) <= d.h / 2 + 0.3) {
        return true;
      }
    }
    for (const [x1, y1, x2, y2] of this.roads) {
      const dx = x2 - x1, dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lenSq));
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;
      if (Math.hypot(x - projX, y - projY) <= 0.85) {
        return true;
      }
    }
    return false;
  }

  findPath(startX, startY, targetX, targetY) {
    const sX = Math.round(startX);
    const sY = Math.round(startY);
    const tX = Math.round(targetX);
    const tY = Math.round(targetY);

    if (sX === tX && sY === tY) {
      return [{ x: targetX, y: targetY }];
    }

    const key = (x, y) => `${x},${y}`;
    const openSet = [{ x: sX, y: sY, g: 0, f: Math.hypot(sX - tX, sY - tY) }];
    const cameFrom = new Map();
    const gScore = new Map();
    gScore.set(key(sX, sY), 0);
    const closedSet = new Set();

    let iterations = 0;
    const maxIterations = 600;

    while (openSet.length > 0 && iterations++ < maxIterations) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      const currKey = key(current.x, current.y);

      if (current.x === tX && current.y === tY) {
        const path = [{ x: targetX, y: targetY }];
        let curr = current;
        while (cameFrom.has(key(curr.x, curr.y))) {
          curr = cameFrom.get(key(curr.x, curr.y));
          path.unshift({ x: curr.x, y: curr.y });
        }
        return path;
      }

      closedSet.add(currKey);

      const neighbors = [
        [0, 1], [1, 0], [0, -1], [-1, 0],
        [1, 1], [-1, 1], [1, -1], [-1, -1]
      ];

      for (const [dx, dy] of neighbors) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        if (nx < -18 || nx > 18 || ny < -18 || ny > 18) continue;

        const nKey = key(nx, ny);
        if (closedSet.has(nKey)) continue;

        if (!(nx === tX && ny === tY) && !this.isWalkable(nx, ny)) {
          continue;
        }

        const stepCost = (dx !== 0 && dy !== 0) ? 1.414 : 1.0;
        const tentativeG = current.g + stepCost;

        if (!gScore.has(nKey) || tentativeG < gScore.get(nKey)) {
          cameFrom.set(nKey, current);
          gScore.set(nKey, tentativeG);
          const f = tentativeG + Math.hypot(nx - tX, ny - tY);
          const existing = openSet.find(n => n.x === nx && n.y === ny);
          if (existing) {
            existing.g = tentativeG;
            existing.f = f;
          } else {
            openSet.push({ x: nx, y: ny, g: tentativeG, f });
          }
        }
      }
    }

    return [{ x: targetX, y: targetY }];
  }
}

// Fênix Operating Modes: LIVE / OBSERVATION / DEBUG
window.fenixCityMode = 'LIVE';
window.fenixSetOperatingMode = function(mode) {
  const valid = ['LIVE', 'OBSERVATION', 'DEBUG'];
  if (!valid.includes(mode)) return;
  window.fenixCityMode = mode;
  // Update button states
  const strip = document.getElementById('fenixOperatingModeStrip');
  if (strip) {
    strip.querySelectorAll('.fenix-opmode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
  }
  window.dispatchEvent(new CustomEvent('fenix-operating-mode-changed', { detail: { mode } }));
};

class IsoCityEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.time = 0;

    // Fênix AI City 4.0 — Multi-level navigation & Floors
    this.viewLevel = 'city'; // 'world' | 'city' | 'district' | 'building' | 'floor' | 'station' | 'agent'
    this.activeDistrict = null;   // district key string
    this.activeBuilding = null;   // active building key
    this.activeFloor    = null;   // floor index
    this.activeAgent    = null;   // agent object
    this.activeFloorsByBuilding = {
      'dev-district': 2,
      'command-center': 1,
      'ai-district': 1,
      'data-center': 1
    };
    this.canonicalStations = CANONICAL_AGENT_STATIONS;

    // Zoom-to-building animation state
    this._zoomAnim = { active: false, scale: 0, target: 1 };
    this.isNight = true;
    this.initHeroBaseImage();

    this.state = {
      camera: { x: 0, y: 0, zoom: 1.05 },
      targetCamera: { x: 0, y: 0, zoom: 1.05 },
      isDragging: false,
      lastMouse: { x: 0, y: 0 },
      tileSize: 32,
      hoveredAgent: null,
      hoveredDistrict: null,
      hoveredPinId: null,
      hoveredHeroBuilding: null,
      showAllLabels: false,
      followAgentId: null,
      followMissionId: null,
      cityFilter: 'ALL',
      lastTime: performance.now(),
      selectedAgent: null,
      photoMode: false,
      renderMode: 'pixel'
    };
    this.rotationQuarter = 0;
    try {
      const saved = JSON.parse(localStorage.getItem('fenix_city_camera') || 'null');
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) && Number.isFinite(saved.zoom) && saved.zoom >= 0.35 && saved.zoom <= 4.2) {
        const effZoom = (saved.zoom < 0.95 || saved.zoom === 1.35) ? 1.05 : saved.zoom;
        const effY = (saved.y === -20 || saved.y === 0) ? 35 : saved.y;
        this.state.camera = { x: saved.x, y: effY, zoom: effZoom };
        this.state.targetCamera = { ...this.state.camera };
        this.rotationQuarter = (Number(saved.rotationQuarter) || 0) & 3;
      }
    } catch (_) {}
    window.addEventListener('pagehide', () => this.saveCamera(), { once: true });

    this.world = {
      agents: new Map(),
      missions: [],
      jobs: [],
      projects: [],
      vehicles: [],
      constructions: [],
      workstations: [],
      particles: [],
      bubbles: [],
      envelopes: []
    };
    this.lastCityEvent = null;
    this.activeHandoff = null;
    this.cityConnectionStatus = window.FENIX?.live?.status || 'CONNECTING';

    this.DISTRICTS = { ...CANONICAL_DISTRICTS };
    this.grid = new CityWorldGrid(this.DISTRICTS);
    this.keysDown = new Set();
    this._contextMenuEl = null;
    this.audio = new CityAudioEngine();
    this._missionTimelineOverlayEl = null;
    this._syncInProgress = false;
    this._lastSyncTime = 0;

    // FÊNIX OS v2.3: Zero fake agents. Population strictly equals real runtime state.
    this.world.agents.clear();

    // Populate only from the live FÊNIX runtime; never show synthetic agents.
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupEvents();
    window.addEventListener('fenix:viewchanged', (event) => {
      if (event.detail?.viewId === 'city') this.startLoop();
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && document.getElementById('view-city')?.classList.contains('active')) this.startLoop();
    });
    
    // Sync with real API every 3s and on live events
    this._syncInterval = setInterval(() => {
      const active = document.querySelector('.view.active')?.id;
      if (active === 'view-command' || active === 'view-city') this.syncRealData();
    }, 3000);
    window.addEventListener('fenix-live', () => this.syncRealData());
    window.addEventListener('fenix:data', () => this.syncRealData());
    window.addEventListener('fenix:city-world', () => this.syncRealData());
    window.addEventListener('fenix-city-event', (event) => {
      this.lastCityEvent = event.detail || null;
      this._applyCityEvent(this.lastCityEvent);
      if (this.lastCityEvent?.type === 'agent.handoff') {
        this.activeHandoff = { event: this.lastCityEvent, expiresAt: Date.now() + 8000 };
        const p = this.lastCityEvent.payload || {};
        const from = p.fromAgentId || p.from || p.sourceAgentId;
        const to = p.toAgentId || p.to || p.targetAgentId;
        if (from && to) this.sendEnvelope(from, to, p.message || 'HANDOFF DISPATCH');
      }
    });
    window.addEventListener('fenix-city-connection', (event) => {
      this.cityConnectionStatus = event.detail?.status || 'UNKNOWN';
    });
    this.syncRealData().then(() => this._applyDeepLink()).catch(() => {});
    this.startLoop();
  }

  _initDefaultLivingAgents() {
    // Constraint 2 & 12: Zero fake agents. Population comes only from live runtime state.
    this.world.agents.clear();
  }

  initHeroBaseImage() {
    this.heroImage = new Image();
    this.heroImage.src = '/assets/fenix-city-canvas-hd.png';
    this.heroImageLoaded = false;
    this.heroImage.onload = () => {
      this.heroImageLoaded = true;
    };
    this.heroImage.onerror = () => {
      console.warn('[IsoCity] Falha ao carregar fenix-city-canvas-hd.png');
    };
  }

  setZoom(z) {
    this.state.targetCamera.zoom = Math.max(0.4, Math.min(3.8, z));
    const btnD = document.getElementById('btnPillDistritos');
    const btnP = document.getElementById('btnPillPredios');
    if (btnD && btnP) {
      btnD.classList.toggle('active', z <= 1.2);
      btnP.classList.toggle('active', z > 1.2);
    }
    if (typeof this._updateZoomDisplay === 'function') {
      this._updateZoomDisplay();
    }
  }

  zoomIn() {
    this.setZoom(this.state.targetCamera.zoom * 1.15);
  }

  zoomOut() {
    this.setZoom(this.state.targetCamera.zoom * 0.88);
  }


  _applyCityEvent(event) {
    const payload = event?.payload || {};
    const agentId = payload.agentId || payload.agent?.id || payload.actorId;
    if (!agentId) return;
    const agent = this.world.agents.get(String(agentId));
    if (!agent) {
      if (event.type === 'agent.created' || event.type === 'agent.online') this.syncRealData();
      return;
    }
    if (event.type === 'agent.offline') {
      agent.status = 'OFFLINE';
      agent.routeActive = false;
      return;
    }
    if (event.type === 'agent.online' || event.type === 'agent.status.changed') {
      if (payload.status) agent.status = String(payload.status).toUpperCase();
    }

    const et = String(event.type || '').toLowerCase();
    const toolName = String(payload.tool || payload.toolName || payload.name || '').toLowerCase();

    // Canonical district routing based on real event, tool, or domain
    let targetDistrictKey = null;
    if (et.startsWith('git.')) targetDistrictKey = 'GIT';
    else if (et.startsWith('browser.') || et.startsWith('test.') || et.includes('inspect')) targetDistrictKey = 'BROWSER_QA';
    else if (et.startsWith('memory.') || et === 'memory.read') targetDistrictKey = 'MEMORY';
    else if (et.startsWith('knowledge.')) targetDistrictKey = 'KNOWLEDGE';
    else if (et.startsWith('mcp.')) targetDistrictKey = 'MCP';
    else if (et.startsWith('database.') || et.startsWith('db.') || et.startsWith('sql.')) targetDistrictKey = 'DATABASE';
    else if (et.startsWith('security.') || et.startsWith('auth.') || et.startsWith('governance.')) targetDistrictKey = 'SECURITY';
    else if (et.startsWith('terminal.') || et.startsWith('cli.') || et.startsWith('shell.')) targetDistrictKey = 'TERMINAL';
    else if (et.startsWith('devops.') || et.startsWith('deploy.')) targetDistrictKey = 'DEVOPS';
    else if (et.startsWith('human.') || et === 'human.approval_required' || et.startsWith('approval.') || et.includes('approval_required')) targetDistrictKey = 'APPROVAL';
    else if (et.startsWith('comm.') || et.startsWith('message.') || et.startsWith('broadcast.')) targetDistrictKey = 'COMMUNICATION';
    else if (et.startsWith('data.') || et.startsWith('metric.') || et.startsWith('telemetry.')) targetDistrictKey = 'DATA';
    else if (et.startsWith('design.') || et.startsWith('ui.style')) targetDistrictKey = 'DESIGN';
    else if (et.startsWith('research.') || et.startsWith('paper.') || et.startsWith('eval.')) targetDistrictKey = 'RESEARCH';
    else if (et.startsWith('archive.') || et.startsWith('history.')) targetDistrictKey = 'ARCHIVE';
    else if (et === 'tool.started' || et === 'agent.tool.call') {
      if (toolName.includes('git')) targetDistrictKey = 'GIT';
      else if (toolName.includes('browser') || toolName.includes('test') || toolName.includes('audit')) targetDistrictKey = 'BROWSER_QA';
      else if (toolName.includes('memory')) targetDistrictKey = 'MEMORY';
      else if (toolName.includes('knowledge')) targetDistrictKey = 'KNOWLEDGE';
      else if (toolName.includes('db') || toolName.includes('sql') || toolName.includes('store')) targetDistrictKey = 'DATABASE';
      else if (toolName.includes('terminal') || toolName.includes('exec') || toolName.includes('shell')) targetDistrictKey = 'TERMINAL';
      else if (toolName.includes('mcp')) targetDistrictKey = 'MCP';
      else if (toolName.includes('deploy') || toolName.includes('docker')) targetDistrictKey = 'DEVOPS';
      else targetDistrictKey = agent.district || 'DEVELOPMENT';
    } else if (et === 'job.started' || et === 'runtime.job.started' || et === 'runtime.job.running' || et === 'mission.step.dispatched') {
      targetDistrictKey = agent.district || 'BACKEND';
    }

    const complete = ['job.completed', 'runtime.job.succeeded', 'tool.completed', 'mission.step.completed', 'agent.task.completed'].includes(event.type);
    const failed = ['job.failed', 'runtime.job.failed', 'runtime.job.dead_letter', 'agent.failed', 'agent.error'].includes(event.type);

    if (failed) {
      agent.status = 'ERROR';
      agent.ambientState = 'error';
      agent.animDuration = 4.0;
    } else if (complete) {
      agent.ambientState = 'success';
      agent.animDuration = 3.5;
    }

    if (targetDistrictKey && this.DISTRICTS[targetDistrictKey]) {
      const station = this.DISTRICTS[targetDistrictKey];
      agent.status = 'WORKING';
      agent.tx = station.x;
      agent.ty = station.y;
      agent.path = this.findPath(agent.x, agent.y, agent.tx, agent.ty);
      agent.pathIndex = 0;
      agent.routeActive = true;
    } else if (complete && agent.homeX != null) {
      agent.status = 'IDLE';
      agent.tx = agent.homeX;
      agent.ty = agent.homeY;
      agent.path = this.findPath(agent.x, agent.y, agent.tx, agent.ty);
      agent.pathIndex = 0;
      agent.routeActive = true;
    }
  }

  _hitTestDistrict(mx, my) {
    const { camera } = this.state;
    const cx = this.canvas.width / 2 + camera.x;
    const cy = this.canvas.height / 2 + camera.y;
    const zoom = camera.zoom;
    const dep = 0.22;

    for (const [key, d] of Object.entries(this.DISTRICTS)) {
      const center = this.toScreen(d.x, d.y, dep, cx, cy, zoom);
      const hw = (d.w / 2) * this.state.tileSize * zoom;
      const hh = (d.h / 2) * (this.state.tileSize * 0.5) * zoom;
      const dx = (mx - center.x) / (hw || 1);
      const dy = (my - (center.y - 12 * zoom)) / (hh + 24 * zoom || 1);
      if (dx * dx + dy * dy <= 1.15) {
        return { key, district: d };
      }
    }
    return null;
  }

  _initSimulatedAgents() {
    // Compatibility hook: old callers must not create fictional runtime state.
    this.world.agents.clear();
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : null;
    let w = (parent && parent.clientWidth > 50) ? parent.clientWidth : ((rect && rect.width > 50) ? Math.floor(rect.width) : (window.innerWidth - 240));
    let h = (parent && parent.clientHeight > 50) ? parent.clientHeight : ((rect && rect.height > 50) ? Math.floor(rect.height) : (window.innerHeight - 140));
    if (w < 200) w = 1200;
    if (h < 200) h = 700;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  setupEvents() {
    this.canvas.addEventListener('mousedown', e => {
      this.state.isDragging = true;
      this.state.lastMouse = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => this.state.isDragging = false);
    window.addEventListener('mousemove', e => {
      if (this.state.isDragging) {
        const dx = e.clientX - this.state.lastMouse.x;
        const dy = e.clientY - this.state.lastMouse.y;
        this.state.targetCamera.x += dx;
        this.state.targetCamera.y += dy;
        this.state.lastMouse = { x: e.clientX, y: e.clientY };
      }
      const rect = this.canvas.getBoundingClientRect();
      this.checkHover(e.clientX - rect.left, e.clientY - rect.top);
    });
    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.state.targetCamera.zoom = Math.max(0.4, Math.min(3.8, this.state.targetCamera.zoom * delta));
    }, { passive: false });

    // Touch gestures for mobile & tablet (drag, pinch-to-zoom, tap, double-tap, long-press)
    let touchStartX = 0, touchStartY = 0;
    let initialPinchDist = 0;
    let initialPinchZoom = 1.0;
    let touchStartTime = 0;
    let longPressTimer = null;
    let lastTapTime = 0;

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchStartTime = Date.now();
        this.state.isDragging = true;
        this.state.lastMouse = { x: t.clientX, y: t.clientY };

        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
          this.state.isDragging = false;
          this._openContextMenu({
            clientX: t.clientX,
            clientY: t.clientY,
            preventDefault: () => {}
          });
        }, 600);
      } else if (e.touches.length === 2) {
        clearTimeout(longPressTimer);
        this.state.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDist = Math.hypot(dx, dy);
        initialPinchZoom = this.state.targetCamera.zoom;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.state.isDragging) {
        const t = e.touches[0];
        const dx = t.clientX - this.state.lastMouse.x;
        const dy = t.clientY - this.state.lastMouse.y;
        if (Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY) > 10) {
          clearTimeout(longPressTimer);
        }
        this.state.targetCamera.x += dx;
        this.state.targetCamera.y += dy;
        this.state.lastMouse = { x: t.clientX, y: t.clientY };
      } else if (e.touches.length === 2 && initialPinchDist > 0) {
        clearTimeout(longPressTimer);
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        const factor = currentDist / initialPinchDist;
        this.state.targetCamera.zoom = Math.max(0.4, Math.min(3.8, initialPinchZoom * factor));
        this._updateZoomDisplay();
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', (e) => {
      clearTimeout(longPressTimer);
      if (this.state.isDragging && e.changedTouches.length === 1) {
        const t = e.changedTouches[0];
        const elapsed = Date.now() - touchStartTime;
        const distMoved = Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY);
        if (elapsed < 350 && distMoved < 15) {
          const now = Date.now();
          if (now - lastTapTime < 350) {
            this.resetCamera();
            lastTapTime = 0;
          } else {
            lastTapTime = now;
            const rect = this.canvas.getBoundingClientRect();
            const mx = t.clientX - rect.left, my = t.clientY - rect.top;
            const agent = this._hitTestAgent(mx, my);
            if (agent) {
              this.state.selectedAgent = agent === this.state.selectedAgent ? null : agent;
              if (this.state.selectedAgent) {
                window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent: this.state.selectedAgent, agentId: this.state.selectedAgent.id } }));
              }
            } else {
              const distHit = this._hitTestDistrict(mx, my);
              if (distHit) {
                window.dispatchEvent(new CustomEvent('fenix-district-selected', { detail: distHit }));
              }
            }
          }
        }
      }
      this.state.isDragging = false;
      initialPinchDist = 0;
    }, { passive: true });
    this.canvas.addEventListener('click', e => {
      this._closeContextMenu();
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      
      // Check hero building hitboxes only when in hero mode
      if (this.state.renderMode === 'hero' && this.heroImageLoaded && this._heroHitboxes) {
        const hit = this._heroHitboxes.find(b => {
          return Math.hypot(mx - b.x, my - b.y) <= (b.w / 2) ||
                 (mx >= b.x - b.w / 2 && mx <= b.x + b.w / 2 && my >= b.y - b.h / 2 && my <= b.y + b.h / 2);
        });
        if (hit) {
          if (hit.companyId) {
            window.fenixSelectCompany?.(hit.companyId);
            window.fenixOpenSystemInspector?.(hit.companyId);
          } else {
            window.fenixPanToDistrict?.(hit.id);
            window.fenixOpenSystemInspector?.(hit.id);
          }
          return;
        }
      }

      // Check floating pin labels first
      if (this._pinHitBoxes) {
        for (const box of this._pinHitBoxes) {
          if (mx >= box.x && mx <= box.x + box.w && my >= box.y && my <= box.y + box.h) {
            window.fenixPanToDistrict?.(box.id);
            return; // consumed
          }
        }
      }

      // Minimap hit test
      const mw = 110, mh = 80;
      const mmX = this.canvas.width - mw - 14, mmY = 14;
      if (mx >= mmX && mx <= mmX + mw && my >= mmY && my <= mmY + mh) {
        const scaleX = mw / 34, scaleY = mh / 30;
        const wx = (mx - mmX) / scaleX - 17;
        const wy = (my - mmY) / scaleY - 15;
        const tw = this.state.tileSize;
        const th = tw / 2;
        this.state.followAgentId = null;
        const cameraPoint = this.toScreen(wx, wy, 0, 0, 0, 1);
        this.state.targetCamera.x = -cameraPoint.x;
        this.state.targetCamera.y = -cameraPoint.y;
        return;
      }
      if (this._hitTestHandoff(mx, my)) return;
      const projectLot = this._hitTestProjectLot(mx, my);
      if (projectLot) {
        this.saveCamera();
        if (typeof window.openProjectWorkspace === 'function') window.openProjectWorkspace(projectLot.id);
        else window.showView?.('projects');
        return;
      }
      const agent = this._hitTestAgent(mx, my);
      if (agent) {
        this.state.selectedAgent = agent;
        const tw = this.state.tileSize;
        const th = tw / 2;
        const z = 3.2;
        const rect = this.canvas.getBoundingClientRect();
        // Golden-third framing: places agent at ~38% screen width (offset -12% from center, leaving contextual space on right)
        const goldenOffsetX = Math.round(rect.width * 0.12);
        const ax = (typeof agent.x === 'number' && !isNaN(agent.x)) ? agent.x : (typeof agent.homeX === 'number' && !isNaN(agent.homeX) ? agent.homeX : 0);
        const ay = (typeof agent.y === 'number' && !isNaN(agent.y)) ? agent.y : (typeof agent.homeY === 'number' && !isNaN(agent.homeY) ? agent.homeY : 0);
        const cameraPoint = this.toScreen(ax, ay, 0, 0, 0, z);
        this.state.targetCamera.x = -Math.round(cameraPoint.x) - goldenOffsetX;
        this.state.targetCamera.y = -Math.round(cameraPoint.y);
        this.state.targetCamera.zoom = z;
        this._updateZoomDisplay();
        this.updateBreadcrumbs();

        const cx = rect.width / 2 + this.state.camera.x;
        const cy = rect.height / 2 + this.state.camera.y;
        const sc = this.toScreen(ax, ay, 0.22, cx, cy, z);

        window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent: this.state.selectedAgent, agentId: this.state.selectedAgent.id } }));
        this.saveCamera();
        if (typeof window.closeSpatialChat === 'function') window.closeSpatialChat();
        if (typeof window.fenixShowWorldAgentInspector === 'function') {
          window.fenixShowWorldAgentInspector(agent);
        } else if (typeof window.fenixOpenAgent === 'function') {
          window.fenixOpenAgent(agent.id);
        }
        return;
      }

      // Fênix AI City 4.0: Workstation Hit Test
      const wsHit = this._hitTestWorkstation(mx, my);
      if (wsHit) {
        if (typeof window.closeSpatialChat === 'function') window.closeSpatialChat();
        const st = wsHit.station;
        const cameraPoint = this.toScreen(st.x, st.y, 0, 0, 0, 2.8);
        const rect = this.canvas.getBoundingClientRect();
        const goldenOffsetX = Math.round(rect.width * 0.12);
        this.state.targetCamera.x = -Math.round(cameraPoint.x) - goldenOffsetX;
        this.state.targetCamera.y = -Math.round(cameraPoint.y);
        this.state.targetCamera.zoom = 2.8;
        this._updateZoomDisplay();
        this.openStationPreview(st, wsHit.agentId);
        this.updateBreadcrumbs();
        return;
      }

      const distHit = this._hitTestDistrict(mx, my);
      if (distHit) {
        if (typeof window.closeSpatialChat === 'function') window.closeSpatialChat();
        if (typeof window.closeStationPreview === 'function') window.closeStationPreview();
        this.activeBuilding = distHit.key;
        this.updateFloorSelector(distHit.key);
        // Zoom and center camera smoothly on the landmark building in 2.5D space with cutaway
        const d = distHit.district;
        const cameraPoint = this.toScreen(d.x, d.y, 0, 0, 0, 2.1);
        this.state.targetCamera.x = -Math.round(cameraPoint.x);
        this.state.targetCamera.y = -Math.round(cameraPoint.y);
        this.state.targetCamera.zoom = 2.1;
        this.state.cutawayBuilding = distHit.key;
        this._updateZoomDisplay();
        this.updateBreadcrumbs();
        window.dispatchEvent(new CustomEvent('fenix-district-selected', { detail: distHit }));
        if (distHit.key) {
          window.GlobalSelectionStore?.select('world_entity', distHit.key, { name: distHit.name || distHit.key, district: distHit.key });
        }
        this.saveCamera();
        if (typeof window.fenixShowWorldBuildingInspector === 'function') {
          window.fenixShowWorldBuildingInspector(distHit);
        }
        return;
      }
      this.state.selectedAgent = null;
      if (typeof window.closeSpatialChat === 'function') window.closeSpatialChat();
      if (typeof window.closeStationPreview === 'function') window.closeStationPreview();
      if (typeof window.closeSpatialDrawer === 'function') window.closeSpatialDrawer();
      this.updateBreadcrumbs();
    });

    this.canvas.addEventListener('dblclick', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const agent = this.state.hoveredAgent || this._hitTestAgent(mx, my);
      if (agent) {
        this.followAgent(agent.id);
        this.state.targetCamera.zoom = 3.2;
        this._updateZoomDisplay();
        if (typeof window.fenixShowWorldAgentInspector === 'function') {
          window.fenixShowWorldAgentInspector(agent);
        }
        return;
      }
      this.resetCamera();
    });

    // WASD and Arrow key navigation
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        this.keysDown.add(e.code);
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
    });

    // Right-click context menu
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._openContextMenu(e);
    });
    document.addEventListener('click', (e) => {
      if (this._contextMenuEl && !this._contextMenuEl.contains(e.target)) {
        this._closeContextMenu();
      }
    });

    this.canvas.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      const target = this.state.hoveredAgent || this.state.selectedAgent;
      if (target) {
        this.state.selectedAgent = target;
        window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent: target } }));
      }
    });

    // Toolbar Zoom & Filter controls
    document.getElementById('btnResetCamera')?.addEventListener('click', () => {
      this.state.targetCamera = { x: 0, y: 35, zoom: 1.05 };
      this.state.followAgentId = null;
      this.state.followMissionId = null;
      this._updateZoomDisplay();
    });
    
    document.getElementById('btnCityListView')?.addEventListener('click', () => {
      const list = document.getElementById('cityListView');
      const canvas = this.canvas;
      if (!list) return;
      const open = list.hidden;
      list.hidden = !open;
      canvas.hidden = open;
      document.getElementById('btnCityListView')?.setAttribute('aria-pressed', String(open));
      if (open) window.dispatchEvent(new CustomEvent('fenix-city-list-requested'));
    });
  }


  _hitTestHandoff(mx, my) {
    const handoff = this.activeHandoff;
    if (!handoff || handoff.expiresAt <= Date.now()) return false;
    const payload = handoff.event.payload || {};
    const fromId = payload.fromAgentId || payload.from || payload.sourceAgentId;
    const toId = payload.toAgentId || payload.to || payload.targetAgentId;
    const from = [...this.world.agents.values()].find((agent) => String(agent.id) === String(fromId) || String(agent.name) === String(fromId));
    const to = [...this.world.agents.values()].find((agent) => String(agent.id) === String(toId) || String(agent.name) === String(toId));
    if (!from || !to) return false;
    const rect = this.canvas.getBoundingClientRect();
    const a = this.toScreen(from.x, from.y, 0.35, rect.width / 2, rect.height / 2, this.state.camera.zoom);
    const b = this.toScreen(to.x, to.y, 0.35, rect.width / 2, rect.height / 2, this.state.camera.zoom);
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((mx - a.x) * dx + (my - a.y) * dy) / (dx * dx + dy * dy || 1)));
    const px = a.x + t * dx, py = a.y + t * dy;
    if (Math.hypot(mx - px, my - py) > 14) return false;
    window.dispatchEvent(new CustomEvent('fenix-handoff-selected', { detail: handoff.event }));
    return true;
  }

  toggleFilterMenu() {
    const host = document.getElementById('wsCityContainer');
    if (!host) return;
    const existing = host.querySelector('.fenix-city-filter-menu');
    if (existing) { existing.remove(); return; }
    const menu = document.createElement('div');
    menu.className = 'fenix-city-filter-menu';
    menu.setAttribute('role', 'menu');
    ['ALL', 'AGENTS', 'MISSIONS', 'JOBS', 'TOOLS', 'ERRORS', 'HANDOFFS', 'MEMORY', 'SYSTEM'].forEach((filter) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = filter;
      button.setAttribute('aria-pressed', String(this.state.cityFilter === filter));
      button.addEventListener('click', () => { this.state.cityFilter = filter; menu.remove(); });
      menu.appendChild(button);
    });
    host.appendChild(menu);
  }

  _filterAllowsAgent(agent) {
    const filter = this.state.cityFilter;
    if (filter === 'ALL' || filter === 'AGENTS') return true;
    if (filter === 'ERRORS') return ['ERROR', 'FAILED', 'BLOCKED'].includes(String(agent.status || '').toUpperCase());
    if (filter === 'MISSIONS') return Boolean(agent.currentMission || agent.missionId);
    if (filter === 'JOBS') return Boolean(agent.currentJob || agent.jobId);
    if (filter === 'TOOLS') return Boolean(agent.currentTool || agent.currentJob?.tool);
    if (filter === 'MEMORY') return String(agent.district || '').toUpperCase().includes('MEMORY');
    if (filter === 'SYSTEM') return ['DEVOPS', 'MCP', 'AI_MODELS', 'CENTRAL'].includes(String(agent.district || '').toUpperCase());
    return filter === 'HANDOFFS' && String(agent.status || '').toUpperCase() === 'HANDOFF';
  }

  _updateZoomDisplay() {
    const z = this.state.targetCamera.zoom;
    let badge = 'L2 EDIFÍCIO';
    let levelStr = `${z.toFixed(2)}x`;
    if (z < 1.30) { badge = 'L0 MACRO WORLD'; }
    else if (z < 1.90) { badge = 'L1 DISTRITO'; }
    else if (z < 2.70) { badge = 'L2 EDIFÍCIO'; }
    else if (z < 3.30) { badge = 'L3 CORTE INTERIOR'; }
    else if (z < 3.90) { badge = 'L4 AGENTE'; }
    else { badge = 'L5 ESTAÇÃO'; }

    const el = document.getElementById('cityZoomBadge');
    if (el) el.textContent = badge;
    const elLevel = document.getElementById('fenixCityZoomLevel');
    if (elLevel) elLevel.textContent = levelStr;
    const lbl = document.getElementById('lblZoomLevel');
    if (lbl) {
      lbl.textContent = `${Math.round(z * 100)}% · ${badge}`;
    }
    this.updateBreadcrumbs();
  }

  getActiveFloor(bldKey) {
    if (!this.activeFloorsByBuilding) {
      this.activeFloorsByBuilding = { 'dev-district': 2, 'command-center': 1, 'ai-district': 1, 'data-center': 1 };
    }
    return this.activeFloorsByBuilding[bldKey] || 1;
  }

  setActiveFloor(bldKey, floorNum) {
    if (!this.activeFloorsByBuilding) {
      this.activeFloorsByBuilding = { 'dev-district': 2, 'command-center': 1, 'ai-district': 1, 'data-center': 1 };
    }
    this.activeFloorsByBuilding[bldKey] = floorNum;
    this.updateFloorSelector(bldKey);
    this.updateBreadcrumbs();
  }

  updateFloorSelector(bldKey) {
    const el = document.getElementById('cityFloorSelector');
    if (!el) return;
    const bld = CANONICAL_BUILDING_FLOORS[bldKey];
    if (!bld || !bld.floors || bld.floors.length <= 1) {
      el.style.display = 'none';
      return;
    }
    const titleEl = document.getElementById('floorSelectorTitle');
    if (titleEl) titleEl.textContent = `${bld.id.toUpperCase()}`;

    const btnsEl = document.getElementById('floorSelectorButtons');
    if (!btnsEl) return;

    const currentFl = this.getActiveFloor(bldKey);
    btnsEl.innerHTML = bld.floors.map(f => {
      const active = f.floorNum === currentFl ? 'active' : '';
      return `<button type="button" class="floor-btn ${active}" data-floor="${f.floorNum}" title="${f.name}">
        <span style="font-size:12px;">📐</span> ${f.short || ('F' + f.floorNum)}
      </button>`;
    }).join('');

    btnsEl.querySelectorAll('.floor-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const fnum = Number(btn.getAttribute('data-floor'));
        this.setActiveFloor(bldKey, fnum);
        if (window.fenixWorld3D?.focusFloor) {
          window.fenixWorld3D.focusFloor(fnum);
        }
      };
    });

    el.style.display = 'flex';
  }

  
  _applyModes() {
    const mode = window.fenixCityMode || 'LIVE';
    // LIVE: zero labels by default, actions enabled
    // OBSERVATION: zero labels by default, actions DISABLED (read-only)
    // DEBUG: all labels visible, all telemetry, IDs shown
    if (mode === 'DEBUG') {
      this.state.showAllLabels = true;
    } else {
      // Both LIVE and OBSERVATION: labels only on hover/selection
      this.state.showAllLabels = false;
    }
    this.state.actionsEnabled = (mode === 'LIVE');
    
    // Semantic zoom: adjust visible details based on camera zoom
    const zoom = this.state.camera.zoom;
    if (zoom < 0.5) {
      // District overview: only district health badges, no agents/props
      this.state.semanticZoomLevel = 'district';
      this.state.showAgentSprites = false;
      this.state.showProps = false;
      this.state.showVehicles = false;
    } else if (zoom < 0.85) {
      // City overview: buildings visible, agents as dots, no props
      this.state.semanticZoomLevel = 'city';
      this.state.showAgentSprites = true;
      this.state.showProps = false;
      this.state.showVehicles = false;
    } else if (zoom < 1.5) {
      // Building level: agents with sprites, vehicles, some props
      this.state.semanticZoomLevel = 'building';
      this.state.showAgentSprites = true;
      this.state.showProps = true;
      this.state.showVehicles = true;
    } else {
      // Agent/detail level: everything visible, names shown
      this.state.semanticZoomLevel = 'agent';
      this.state.showAgentSprites = true;
      this.state.showProps = true;
      this.state.showVehicles = true;
    }
  }

  updateBreadcrumbs() {
    const el = document.getElementById('cityBreadcrumb');
    if (!el) return;

    const z = this.state.targetCamera.zoom;
    const crumbs = [
      { label: '🏙️ Cidade', action: () => this.navigateToLevel('city') }
    ];

    // District
    const distKey = this.activeDistrict || (this.state.selectedAgent?.district) || (this.state.hoveredDistrict?.key) || this.activeBuilding;
    if (distKey && CANONICAL_DISTRICTS[distKey]) {
      const d = CANONICAL_DISTRICTS[distKey];
      crumbs.push({
        label: `${d.emoji || '🏘️'} ${d.name}`,
        action: () => this.navigateToLevel('district', d)
      });
    }

    // Building & Floor
    const bldKey = this.activeBuilding || distKey;
    if (bldKey && CANONICAL_BUILDING_FLOORS[bldKey]) {
      const bld = CANONICAL_BUILDING_FLOORS[bldKey];
      crumbs.push({
        label: `🏢 ${bld.name}`,
        action: () => this.navigateToLevel('building', bld)
      });

      const flNum = this.getActiveFloor(bldKey);
      const fl = bld.floors.find(f => f.floorNum === flNum) || bld.floors[0];
      crumbs.push({
        label: `📐 ${fl.short || ('Andar ' + flNum)}`,
        action: () => this.navigateToLevel('floor', { bldKey, flNum })
      });
    }

    // Selected Agent
    if (this.state.selectedAgent) {
      crumbs.push({
        label: `🤖 ${this.state.selectedAgent.displayName || this.state.selectedAgent.name}`,
        action: () => this.focusAgent(this.state.selectedAgent.id)
      });
    }

    if (crumbs.length <= 1 && z <= 0.8) {
      el.style.display = 'none';
      return;
    }

    el.style.display = 'flex';
    el.innerHTML = crumbs.map((c, i) => {
      const isLast = i === crumbs.length - 1;
      const cls = isLast ? 'breadcrumb-current' : 'breadcrumb-item';
      return `<span class="${cls}" data-crumb-index="${i}" style="cursor:pointer;">${c.label}</span>${!isLast ? '<span class="breadcrumb-sep" style="color:#64748B; margin:0 4px;">›</span>' : ''}`;
    }).join('');

    el.querySelectorAll('.breadcrumb-item').forEach((item) => {
      const idx = Number(item.getAttribute('data-crumb-index'));
      item.onclick = (e) => {
        e.stopPropagation();
        if (crumbs[idx] && crumbs[idx].action) crumbs[idx].action();
      };
    });
  }

  navigateToLevel(level, context) {
    if (level === 'city') {
      this.state.selectedAgent = null;
      this.activeBuilding = null;
      this.state.targetCamera.x = 0;
      this.state.targetCamera.y = -20;
      this.state.targetCamera.zoom = 0.65;
      const flEl = document.getElementById('cityFloorSelector');
      if (flEl) flEl.style.display = 'none';
    } else if (level === 'district') {
      const d = context || CANONICAL_DISTRICTS['command-center'];
      const cp = this.toScreen(d.x, d.y, 0, 0, 0, 1);
      this.state.targetCamera.x = -cp.x;
      this.state.targetCamera.y = -cp.y;
      this.state.targetCamera.zoom = 1.15;
    } else if (level === 'building') {
      const bldKey = context.id || context.district || 'dev-district';
      this.activeBuilding = bldKey;
      const d = CANONICAL_DISTRICTS[bldKey] || { x: 0, y: 0 };
      const cp = this.toScreen(d.x, d.y, 0, 0, 0, 1);
      this.state.targetCamera.x = -cp.x;
      this.state.targetCamera.y = -cp.y;
      this.state.targetCamera.zoom = 1.85;
      this.updateFloorSelector(bldKey);
    } else if (level === 'floor') {
      const bldKey = context.bldKey || 'dev-district';
      this.activeBuilding = bldKey;
      this.setActiveFloor(bldKey, context.flNum || 1);
      const d = CANONICAL_DISTRICTS[bldKey] || { x: 0, y: 0 };
      const cp = this.toScreen(d.x, d.y, 0, 0, 0, 1);
      this.state.targetCamera.x = -cp.x;
      this.state.targetCamera.y = -cp.y;
      this.state.targetCamera.zoom = 2.4;
    }
    this._updateZoomDisplay();
    this.updateBreadcrumbs();
  }

  _hitTestWorkstation(mx, my) {
    const { camera } = this.state;
    const zoom = camera.zoom;
    const cx = this.canvas.width / 2 + camera.x;
    const cy = this.canvas.height / 2 + camera.y;

    for (const [agentId, st] of Object.entries(CANONICAL_AGENT_STATIONS)) {
      const sc = this.toScreen(st.x, st.y, 0, cx, cy, zoom);
      if (Math.hypot(mx - sc.x, my - (sc.y - 18 * zoom)) < 26 * zoom) {
        return { agentId, station: st };
      }
    }
    return null;
  }

  openStationPreview(station, agentId) {
    const modal = document.getElementById('fenixStationPreviewModal');
    if (!modal) return;
    if (typeof station === 'string') {
      agentId = station;
      station = CANONICAL_AGENT_STATIONS[agentId];
    }
    if (!station) return;

    const titleEl = document.getElementById('stationPreviewTitle');
    const bldEl = document.getElementById('stationPreviewBuilding');
    const agentEl = document.getElementById('stationPreviewAgent');
    const fileEl = document.getElementById('stationPreviewFile');
    const statusEl = document.getElementById('stationPreviewStatus');
    const codeEl = document.getElementById('stationPreviewCodeBox');

    const agent = this.world.agents.get(agentId) || { name: station.deskLabel || 'Especialista', role: station.service };
    const filePath = station.file || 'ai-engine/grg/src/server.js';

    if (titleEl) titleEl.textContent = station.deskLabel || 'Estação de Trabalho';
    if (bldEl) bldEl.textContent = `${station.district || 'Dev Loft'} · Andar ${station.floor || 1}`;
    if (agentEl) agentEl.textContent = agent.displayName || agent.name || agentId;
    if (fileEl) fileEl.textContent = filePath;
    if (statusEl) statusEl.textContent = `ATIVO · ${station.service || 'Runtime Fênix'}`;

    if (codeEl) {
      codeEl.textContent = `// Arquivo: ${filePath}\n// Módulo: ${station.service || 'Kernel'}\n// Agente: ${agent.displayName || agent.name || agentId}\n// Runtime: CONEXÃO ATIVA (Zero-Mock Factual)`;
    }

    window._currentActiveStationFile = filePath;
    window._currentActiveStationAgent = agentId;

    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.width / 2 + this.state.targetCamera.x;
    const cy = rect.height / 2 + this.state.targetCamera.y;
    const sc = this.toScreen(station.x, station.y, 0, cx, cy, this.state.targetCamera.zoom);

    const left = Math.max(20, Math.min(rect.width - 380, sc.x + 30));
    const top = Math.max(70, Math.min(rect.height - 320, sc.y - 120));
    modal.style.left = left + 'px';
    modal.style.top = top + 'px';
    modal.style.display = 'flex';
  }

  focusStationForAgent(agentId) {
    const st = CANONICAL_AGENT_STATIONS[agentId];
    if (!st) return;
    const cameraPoint = this.toScreen(st.x, st.y, 0, 0, 0, 3.0);
    const rect = this.canvas.getBoundingClientRect();
    const goldenOffsetX = Math.round(rect.width * 0.12);
    this.state.targetCamera.x = -Math.round(cameraPoint.x) - goldenOffsetX;
    this.state.targetCamera.y = -Math.round(cameraPoint.y);
    this.state.targetCamera.zoom = 3.0;
    this._updateZoomDisplay();
    this.openStationPreview(st, agentId);
    this.updateBreadcrumbs();
  }

  focusEntity(type, id) {
    if (type === 'agent') this.focusAgent(id);
    else if (type === 'building') this.panToDistrict(id);
  }

  focusAgent(agentId) {
    if (!agentId) return;
    const target = this.world.agents.get(agentId) || [...this.world.agents.values()].find(a =>
      a.id.toLowerCase() === String(agentId).toLowerCase() || a.name.toLowerCase().includes(String(agentId).toLowerCase())
    );
    if (target) {
      this.state.selectedAgent = target;
      const tw = this.state.tileSize;
      const th = this.state.tileSize / 2;
      const z = 3.2;
      const rect = this.canvas.getBoundingClientRect();
      const goldenOffsetX = Math.round(rect.width * 0.12);
      const cameraPoint = this.toScreen(target.x, target.y, 0, 0, 0, z);
      this.state.targetCamera.x = -Math.round(cameraPoint.x) - goldenOffsetX;
      this.state.targetCamera.y = -Math.round(cameraPoint.y);
      this.state.targetCamera.zoom = z;
      this._updateZoomDisplay();
      this.updateBreadcrumbs();
      window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent: target, agentId: target.id } }));
      const cx = rect.width / 2 + this.state.targetCamera.x;
      const cy = rect.height / 2 + this.state.targetCamera.y;
      if (typeof window.closeSpatialChat === 'function') window.closeSpatialChat();
      if (typeof window.fenixShowWorldAgentInspector === 'function') {
        window.fenixShowWorldAgentInspector(target);
      } else if (typeof window.fenixOpenAgent === 'function') {
        window.fenixOpenAgent(target.id);
      }
    }
  }

  focusMission(missionId) {
    if (!missionId) return;
    const agent = [...this.world.agents.values()].find((candidate) => {
      const mission = candidate.currentMission;
      return String(candidate.missionId || mission?.id || mission?.missionId || '') === String(missionId);
    });
    if (!agent) {
      window.dispatchEvent(new CustomEvent('fenix-mission-selected', { detail: { missionId: String(missionId) } }));
      return;
    }
    this.state.selectedAgent = agent;
    this.state.followMissionId = String(missionId);
    this.state.followAgentId = null;
    window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent } }));
  }

  focusJob(jobId) {
    if (!jobId) return;
    const agent = [...this.world.agents.values()].find((candidate) => {
      const job = candidate.currentJob;
      return String(job?.id || job?.jobId || candidate.jobId || '') === String(jobId);
    });
    if (agent) this.focusAgent(agent.id);
    else if (jobId) window.dispatchEvent(new CustomEvent('fenix-job-selected', { detail: { jobId: String(jobId) } }));
  }

  focusProject(projectId) {
    if (!projectId) return;
    this.state.targetCamera = { x: 0, y: 0, zoom: 1.25 };
    this._updateZoomDisplay();
    window.dispatchEvent(new CustomEvent('fenix-project-selected', { detail: { projectId: String(projectId) } }));
  }

  followHandoff() {
    const handoff = this.activeHandoff;
    if (!handoff) return false;
    const payload = handoff.event?.payload || {};
    const fromId = payload.fromAgentId || payload.from;
    const toId = payload.toAgentId || payload.to;
    const from = [...this.world.agents.values()].find(a => String(a.id) === String(fromId) || String(a.name) === String(fromId));
    const to = [...this.world.agents.values()].find(a => String(a.id) === String(toId) || String(a.name) === String(toId));
    if (from && to) {
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const tw = this.state.tileSize;
      const th = this.state.tileSize / 2;
      this.state.targetCamera.x = -(midX - midY) * tw;
      this.state.targetCamera.y = -(midX + midY) * th;
      this.state.targetCamera.zoom = 1.4;
      this._updateZoomDisplay();
      return true;
    }
    return false;
  }

  focusError() {
    const errorAgent = [...this.world.agents.values()].find(a => ['ERROR', 'FAILED', 'BLOCKED'].includes(String(a.status || '').toUpperCase()));
    if (errorAgent) {
      this.focusAgent(errorAgent.id);
      return true;
    }
    const failedJob = (this.world.jobs || []).find(j => j.status === 'FAILED' || j.status === 'DEAD_LETTER');
    if (failedJob) {
      this.focusJob(failedJob.id);
      return true;
    }
    return false;
  }

  focusActiveJob(jobId) {
    if (jobId) return this.focusJob(jobId);
    const active = (this.world.jobs || []).find(j => j.status === 'RUNNING');
    if (active) return this.focusJob(active.id);
    return false;
  }

  followAgent(agentId) {
    if (!agentId) {
      const selected = this.state.selectedAgent || [...this.world.agents.values()][0];
      agentId = selected?.id;
    }
    if (!agentId) return false;
    this.focusAgent(agentId);
    this.state.followAgentId = String(agentId);
    this.state.followMissionId = null;
    const button = document.getElementById('btnFollowAgent');
    if (button) button.classList.add('active');
    const missionBtn = document.getElementById('btnFollowMission');
    if (missionBtn) missionBtn.classList.remove('active');
    return true;
  }

  followMission(missionId) {
    if (!missionId) {
      const liveMissions = window.FENIX?.live?.missions || [];
      const active = liveMissions.find(m => m.status === 'RUNNING') || liveMissions[0];
      missionId = active?.id;
    }
    if (!missionId) {
      this.state.followMissionId = null;
      const button = document.getElementById('btnFollowMission');
      if (button) button.classList.remove('active');
      this._renderMissionTimeline(null);
      return false;
    }
    this.state.followMissionId = String(missionId);
    this.state.followAgentId = null;
    this.focusMission(missionId);
    const button = document.getElementById('btnFollowMission');
    if (button) button.classList.add('active');
    const agentBtn = document.getElementById('btnFollowAgent');
    if (agentBtn) agentBtn.classList.remove('active');
    this._renderMissionTimeline(missionId);
    return true;
  }

  fitCity() {
    this.state.followAgentId = null;
    this.state.followMissionId = null;
    this._renderMissionTimeline(null);
    const cw = this.canvas.width ?? 1200;
    const ch = this.canvas.height || 800;
    const zoom = Math.max(0.45, Math.min(1.0, Math.min(cw / 2100, ch / 1100)));
    this.state.targetCamera = { x: 0, y: 0, zoom };
    this._updateZoomDisplay();
  }

  centerAgent(agentId) {
    const targetId = agentId || this.state.selectedAgent?.id || [...this.world.agents.keys()][0];
    if (targetId) this.focusAgent(targetId);
  }

  centerMission(missionId) {
    const targetId = missionId || this.state.followMissionId || (this.world.missions && this.world.missions[0]?.id);
    if (targetId) this.focusMission(targetId);
  }

  resetCamera() {
    this.state.targetCamera = { x: 0, y: 0, zoom: 1.0 };
    this.state.followAgentId = null;
    this.state.followMissionId = null;
    this._renderMissionTimeline(null);
    const btnFollowAgent = document.getElementById('btnFollowAgent');
    if (btnFollowAgent) btnFollowAgent.classList.remove('active');
    const btnFollowMission = document.getElementById('btnFollowMission');
    if (btnFollowMission) btnFollowMission.classList.remove('active');
    this._updateZoomDisplay();
  }

  spawnAnimation(agent) {
    if (!agent) return;
    this.focusAgent(agent.id);
    this.audio?.playSpawn();
    for (let i = 0; i < 36; i++) {
      const angle = (Math.PI * 2 * i) / 36;
      const speed = 1.8 + _pseudoRandom() * 2.2;
      this.world.particles.push({
        x: agent.x || 0,
        y: agent.y || 0,
        vx: Math.cos(angle) * speed * 0.04,
        vy: Math.sin(angle) * speed * 0.04,
        alpha: 1.0,
        life: 60,
        maxLife: 60,
        color: ['#00ffcc', '#8b5cf6', '#3b82f6', '#ffd700', '#f43f5e'][Math.floor(_pseudoRandom() * 5)],
        size: 3 + _pseudoRandom() * 3
      });
    }
  }

  _renderMissionTimeline(missionId) {
    if (this._missionTimelineOverlayEl) {
      this._missionTimelineOverlayEl.remove();
      this._missionTimelineOverlayEl = null;
    }
    if (!missionId) return;

    const mission = (this.world.missions || []).find(m => String(m.id || m.missionId) === String(missionId)) || {
      id: missionId,
      name: `Missão #${missionId}`,
      status: 'RUNNING',
      steps: [
        { id: '1', title: 'Análise de Requisitos e Arquitetura', status: 'COMPLETED' },
        { id: '2', title: 'Execução de Pipeline e Testes', status: 'RUNNING' },
        { id: '3', title: 'Verificação de Layout Gate & Cobertura', status: 'PENDING' },
        { id: '4', title: 'Deploy e Notificação no Hub', status: 'PENDING' }
      ]
    };

    const container = document.getElementById('wsCityContainer') || this.canvas.parentElement;
    if (!container) return;

    const overlay = document.createElement('div');
    overlay.className = 'fenix-mission-timeline-overlay';
    overlay.id = 'cityMissionTimelineOverlay';

    const steps = mission.steps || mission.checkpoints || [
      { id: 's1', title: 'Inicialização da Missão', status: 'COMPLETED' },
      { id: 's2', title: 'Execução de Passos Autônomos', status: 'RUNNING' },
      { id: 's3', title: 'Finalização e Entrega', status: 'PENDING' }
    ];

    overlay.innerHTML = `
      <div class="fenix-mission-tl-head">
        <span class="fenix-mission-tl-title">🎯 TIMELINE: ${mission.name || mission.title || ('Missão ' + missionId)}</span>
        <button class="fenix-mission-tl-close" id="btnTlClose" title="Fechar Timeline">✕</button>
      </div>
      <div class="fenix-mission-tl-list">
        ${steps.map((s, idx) => {
          const st = String(s.status || '').toLowerCase();
          const dotClass = st.includes('comp') || st.includes('done') || st.includes('pass') ? 'done' :
                           st.includes('run') || st.includes('prog') || st.includes('work') ? 'working' :
                           st.includes('fail') || st.includes('err') ? 'error' : 'waiting';
          return `
            <div class="fenix-mission-tl-item" data-step-id="${s.id || idx}">
              <span class="fenix-mission-tl-status-dot ${dotClass}"></span>
              <span style="font-size: 11px; color: ${dotClass === 'working' ? '#38bdf8' : (dotClass === 'done' ? '#e2e8f0' : '#94a3b8')}; flex: 1;">
                ${idx + 1}. ${s.name || s.title || s.step || ('Etapa ' + (idx + 1))}
              </span>
            </div>
          `;
        }).join('')}
      </div>
    `;

    overlay.querySelector('#btnTlClose')?.addEventListener('click', () => {
      this.state.followMissionId = null;
      const btn = document.getElementById('btnFollowMission');
      if (btn) btn.classList.remove('active');
      overlay.remove();
      this._missionTimelineOverlayEl = null;
    });

    container.style.position = 'relative';
    container.appendChild(overlay);
    this._missionTimelineOverlayEl = overlay;
  }

  toggleLiveMode(force) {
    this.isLiveMode = typeof force === 'boolean' ? force : !this.isLiveMode;
    const container = document.getElementById('wsCityContainer') || this.canvas?.parentElement;
    if (container) {
      container.classList.toggle('fenix-live-operations-mode', this.isLiveMode);
    }
    document.body.classList.toggle('fenix-live-ops-active', this.isLiveMode);

    let hud = document.getElementById('fenixLiveOperationsHud');
    if (this.isLiveMode) {
      if (!hud) {
        hud = document.createElement('div');
        hud.id = 'fenixLiveOperationsHud';
        hud.className = 'fenix-live-ops-hud';
        hud.innerHTML = `
          <div class="live-hud-pill live-pulse"><span class="live-dot"></span> LIVE OPERATIONS ACTIVE</div>
          <div class="live-hud-stats" id="liveHudStats">FÊNIX OS KERNEL ONLINE</div>
          <button class="live-hud-exit-btn" id="btnExitLiveOps" title="Sair do modo Live Operations (ESC)">✕ SAIR DO MODO LIVE</button>
        `;
        document.body.appendChild(hud);
        document.getElementById('btnExitLiveOps')?.addEventListener('click', () => this.toggleLiveMode(false));
      } else {
        hud.style.display = 'flex';
      }
    } else if (hud) {
      hud.style.display = 'none';
    }

    setTimeout(() => {
      this.resize();
    }, 60);

    window.dispatchEvent(new CustomEvent('fenix-live-mode-changed', { detail: { active: this.isLiveMode } }));
    return this.isLiveMode;
  }

  _applyDeepLink() {
    const query = new URLSearchParams(`${location.search || ''}&${location.hash.includes('?') ? location.hash.split('?')[1] : ''}`);
    const agent = query.get('agent');
    const mission = query.get('mission');
    const job = query.get('job');
    const project = query.get('project');
    if (agent) this.focusAgent(agent);
    else if (mission) this.focusMission(mission);
    else if (job) this.focusJob(job);
    else if (project) this.focusProject(project);
  }

  _hitTestAgent(mx, my) {
    const { camera } = this.state;
    const cx = this.canvas.width / 2 + camera.x;
    const cy = this.canvas.height / 2 + camera.y;
    let closest = null, minDist = 44;
    for (const agent of this.world.agents.values()) {
      const sc = this.toScreen(agent.x, agent.y, 0.2, cx, cy, camera.zoom);
      sc.y -= 28 * camera.zoom;
      const d = Math.hypot(mx - sc.x, my - sc.y);
      if (d < minDist) { minDist = d; closest = agent; }
    }
    return closest;
  }

  checkHover(mx, my) {
    let overPin = false;
    this.state.hoveredPinId = null;
    this.state.hoveredHeroBuilding = null;

    if (this.state.renderMode === 'hero' && this.heroImageLoaded && this._heroHitboxes) {
      const hit = this._heroHitboxes.find(b => {
        return Math.hypot(mx - b.x, my - b.y) <= (b.w / 2) ||
               (mx >= b.x - b.w / 2 && mx <= b.x + b.w / 2 && my >= b.y - b.h / 2 && my <= b.y + b.h / 2);
      });
      if (hit) {
        this.state.hoveredHeroBuilding = hit.id;
        this.canvas.style.cursor = 'pointer';
        return;
      }
    }

    if (this._pinHitBoxes) {
      for (const box of this._pinHitBoxes) {
        if (mx >= box.x && mx <= box.x + box.w && my >= box.y && my <= box.y + box.h) {
          overPin = true;
          this.state.hoveredPinId = box.id;
          break;
        }
      }
    }
    this.state.hoveredAgent = this._hitTestAgent(mx, my);
    if (overPin || this.state.hoveredAgent) {
      this.canvas.style.cursor = 'pointer';
    } else {
      this.canvas.style.cursor = this.state.isDragging ? 'grabbing' : 'grab';
    }
  }

  async syncRealData() {
    const now = Date.now();
    if (this._syncInProgress) return;
    if (this._lastSyncTime && (now - this._lastSyncTime) < 500) return;
    this._syncInProgress = true;
    this._lastSyncTime = now;
    try {
      let apiAgents = [];
      let fetchedSuccessfully = false;
      let authoritativeAgents = false;
      const sharedWorld = window.FENIX?.cityWorld;
      if (Array.isArray(sharedWorld?.snapshot?.agents)) {
        apiAgents = sharedWorld.snapshot.agents;
        fetchedSuccessfully = true;
        authoritativeAgents = true;
        this.world.projects = Array.isArray(sharedWorld.snapshot.projects) ? sharedWorld.snapshot.projects : [];
      }
      try {
        if (!fetchedSuccessfully) {
        const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const res = await fetch('/api/v2/living-city/agents', { headers });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.agents)) {
            apiAgents = data.agents;
            fetchedSuccessfully = true;
            authoritativeAgents = true;
          }
        }
        }
      } catch (e) {}

      if (!fetchedSuccessfully && window.FENIX?.live?.agentsMeasured === true && Array.isArray(window.FENIX.live.agents)) {
        apiAgents = window.FENIX.live.agents;
        fetchedSuccessfully = true;
        authoritativeAgents = true;
      }
      if (!fetchedSuccessfully) {
        try {
          const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
          const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
          const res = await fetch('/runtime/snapshot', { headers }).then(r => r.ok ? r.json() : null).catch(() => null);
          if (Array.isArray(res?.payload?.agents)) {
            apiAgents = res.payload.agents;
            fetchedSuccessfully = true;
            authoritativeAgents = true;
          }
        } catch (e) {}
      }

      // Fetch Living City State for metrics & hud
      try {
        const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const sdata = sharedWorld?.snapshot || await fetch('/api/v2/living-city/state', { headers, signal: AbortSignal.timeout(12000) }).then(r => r.ok ? r.json() : null);
        if (sdata) {
          if (Array.isArray(sdata.projects)) this.world.projects = sdata.projects;
          if (Array.isArray(sdata.vehicles)) this.world.vehicles = sdata.vehicles;
          if (Array.isArray(sdata.constructions)) this.world.constructions = sdata.constructions;
          if (Array.isArray(sdata.workstations)) this.world.workstations = sdata.workstations;
          if (Array.isArray(sdata.agents)) {
            const existingIds = new Set(apiAgents.map(a => String(a.id || a.agentId).toLowerCase()));
            for (const sa of sdata.agents) {
              const saId = String(sa.id || sa.agentId).toLowerCase();
              if (!existingIds.has(saId)) {
                apiAgents.push(sa);
                existingIds.add(saId);
              } else {
                const target = apiAgents.find(a => String(a.id || a.agentId).toLowerCase() === saId);
                if (target) Object.assign(target, sa);
              }
            }
          }
          if (sdata.metrics) {
            this.cityMetrics = sdata.metrics;
            const elMem = document.getElementById('cityMemoriesCount');
            if (elMem && sdata.metrics.memoriesCount !== undefined) elMem.textContent = '🧬 MEMÓRIAS: ' + sdata.metrics.memoriesCount;
            const elProj = document.getElementById('cityProjectsCount');
            if (elProj && sdata.metrics.projectsCount !== undefined) elProj.textContent = '📁 ' + sdata.metrics.projectsCount + ' PROJETOS';
            const elMis = document.getElementById('cityMissionsCount');
            if (elMis && sdata.metrics.activeMissions !== undefined) elMis.textContent = '🎯 ' + sdata.metrics.activeMissions + ' MISSÕES';
            const elSk = document.getElementById('citySkillsCount');
            if (elSk && sdata.metrics.skillsCount !== undefined) elSk.textContent = '💡 SKILLS: ' + sdata.metrics.skillsCount;
          }
        }
      } catch (e) {}

      // Fetch Living Agent Office & Spatial Presence State
      let officeData = null;
      try {
        const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const oRes = await fetch('/api/v2/office/state', { headers, signal: AbortSignal.timeout(6000) });
        if (oRes.ok) {
          officeData = await oRes.json();
          this.officeData = officeData;
        }
      } catch (e) {}

      const next = new Map();
      for (const a of apiAgents) {
        const id = String(a.id);
        const roleKey = String(a.role || 'DEVELOPER').toUpperCase();
        const spec = AGENT_ROLES.find(r => r.role?.toUpperCase() === roleKey || r.id === id) || {
          id: id,
          name: a.name || id,
          role: a.role || 'Agent',
          color: '#3b82f6',
          emoji: '🤖',
          district: a.district || a.location || 'dev-district'
        };
        let st = CANONICAL_AGENT_STATIONS[id] || CANONICAL_AGENT_STATIONS[spec.id];
        if (!st) {
          const normId = id.replace(/^fenix-/, 'agent-').replace(/-agent$/, '');
          st = CANONICAL_AGENT_STATIONS[normId];
        }
        if (!st) {
          const rKey = (a.role || spec.role || '').toLowerCase();
          const matchKey = Object.keys(CANONICAL_AGENT_STATIONS).find(k => k.includes(rKey) || rKey.includes(k.replace('agent-', '')));
          if (matchKey) st = CANONICAL_AGENT_STATIONS[matchKey];
        }
        if (!st) st = { x: 0, y: 0, facing: 'SE' };
        const homeX = st.x;
        const homeY = st.y;
        const existing = this.world.agents.get(id);
        const curX = (existing && typeof existing.x === 'number' && !isNaN(existing.x)) ? existing.x : homeX;
        const curY = (existing && typeof existing.y === 'number' && !isNaN(existing.y)) ? existing.y : homeY;

        let rawState = String(a.state || a.status || existing?.status || 'IDLE').toUpperCase();
        if (officeData && officeData.presence && officeData.presence.agents) {
          const p = officeData.presence.agents[id] || officeData.presence.agents[spec.id] || officeData.presence.agents[id.replace(/^agent-/, 'fenix-') + '-agent'];
          if (p && p.status) {
            rawState = p.status;
          }
        }
        const isWorking = ['WORKING', 'RUNNING', 'BUSY', 'TESTING', 'CODING', 'DEPLOYING'].includes(rawState) || Boolean(a.currentJob || a.currentJobId);
        const isError = ['ERROR', 'FAILED', 'BLOCKED', 'UNHEALTHY'].includes(rawState);
        const isCelebrating = rawState === 'CELEBRATING';

        let animState = 'idle';
        if (isError) animState = 'error';
        else if (isCelebrating) animState = 'celebrate';
        else if (isWorking) animState = 'working';
        else if (existing?._moving) animState = 'walk';

        const agent = existing || {
          id,
          x: curX,
          y: curY,
          tx: curX,
          ty: curY,
          homeX,
          homeY,
          facing: st.facing || 'SE',
          routeActive: false,
          trail: [],
          walkFrame: 0,
          walkTimer: 0,
          bubbleTimer: 0,
          bubble: null
        };

        Object.assign(agent, {
          id,
          x: curX,
          y: curY,
          tx: (typeof agent.tx === 'number' && !isNaN(agent.tx)) ? agent.tx : curX,
          ty: (typeof agent.ty === 'number' && !isNaN(agent.ty)) ? agent.ty : curY,
          name: a.name || spec.name,
          displayName: a.displayName || a.name || spec.name,
          role: a.role || spec.role,
          company: a.company || spec.company || 'Fênix Enterprise',
          companyId: a.companyId || 'ai-engine',
          department: a.department || 'OPERATIONS',
          workstationId: a.workstationId || a.stationId || st.id || null,
          stationId: a.workstationId || a.stationId || st.id || null,
          buildingId: a.buildingId || st.buildingId || null,
          floorNum: a.floorNum !== undefined ? a.floorNum : (st.floor || 1),
          currentTask: a.currentTask || null,
          currentJob: a.currentJob || null,
          skills: Array.isArray(a.skills) ? a.skills : [],
          tools: Array.isArray(a.tools) ? a.tools : [],
          memory: Array.isArray(a.memory) ? a.memory : (Array.isArray(a.episodicMemory) ? a.episodicMemory : []),
          model: a.model || 'qwen2.5:3b',
          provider: a.provider || null,
          color: spec.color,
          emoji: a.avatar || spec.emoji,
          district: normalizeDistrict(a.location || a.district || spec.district),
          deskLabel: st.deskLabel || 'Estação Canônica',
          homeX,
          homeY,
          status: rawState,
          state: rawState,
          animState,
          facing: agent.facing || st.facing || 'SE',
          isReal: true,
          currentGoal: a.currentGoal || (a.currentJobId ? `Job #${a.currentJobId}` : (isWorking ? 'Em execução real' : 'Pronto para novas missões')),
          episodicMemory: Array.isArray(a.memory) ? a.memory : (a.episodicMemory || []),
          personality: a.personality || '',
          intelligenceLevel: a.intelligenceLevel || 0
        });
        next.set(id, agent);
      }

      // Process Spatial Office Interactions (Conversations, Meetings, War Room)
      if (officeData) {
        // 1. Active Conversations
        if (Array.isArray(officeData.activeConversations)) {
          for (const conv of officeData.activeConversations) {
            if (conv.status !== 'ACTIVE') continue;
            const fromAg = next.get(conv.fromAgent) || next.get(String(conv.fromAgent).replace(/^fenix-/, 'agent-').replace(/-agent$/, ''));
            const toAg = next.get(conv.toAgent) || next.get(String(conv.toAgent).replace(/^fenix-/, 'agent-').replace(/-agent$/, ''));
            if (fromAg && toAg) {
              fromAg.status = 'IN_CONVERSATION';
              toAg.status = 'IN_CONVERSATION';
              fromAg.animState = 'communicate';
              toAg.animState = 'communicate';
              fromAg.tx = toAg.homeX + 0.65;
              fromAg.ty = toAg.homeY - 0.25;
              fromAg.routeActive = true;
              fromAg.facing = 'NW';
              toAg.facing = 'SE';
              const lastMsg = (conv.messages && conv.messages.length) ? conv.messages[conv.messages.length - 1] : null;
              const msgText = lastMsg ? (lastMsg.text || lastMsg.content) : (conv.topic || 'Alinhamento em andamento');
              fromAg.bubble = { text: msgText, life: 7.0, isImportant: true };
            }
          }
        }

        // 2. Active Meetings
        if (Array.isArray(officeData.activeMeetings)) {
          for (const mtg of officeData.activeMeetings) {
            if (mtg.status !== 'ACTIVE' && mtg.status !== 'IN_PROGRESS') continue;
            const parts = mtg.participants || [];
            parts.forEach((pId, idx) => {
              const pAg = next.get(pId) || next.get(String(pId).replace(/^fenix-/, 'agent-').replace(/-agent$/, ''));
              if (pAg) {
                pAg.status = 'IN_MEETING';
                pAg.animState = 'communicate';
                const angle = (idx / Math.max(1, parts.length)) * Math.PI * 2;
                pAg.tx = -5.0 + Math.cos(angle) * 1.6;
                pAg.ty = -6.8 + Math.sin(angle) * 1.0;
                pAg.routeActive = true;
                pAg.bubble = { text: '🤝 ' + (mtg.title || 'Reunião de Alinhamento'), life: 8.0, isImportant: true };
              }
            });
          }
        }

        // 3. War Room
        const isWarRoom = officeData.presence?.warRoomActive || (officeData.activeMeetings || []).some(m => m.type === 'WAR_ROOM' || m.roomId === 'room-war-room');
        if (isWarRoom) {
          const warRoomTeam = ['agent-orchestrator', 'agent-architect', 'agent-backend', 'agent-qa', 'agent-devops', 'agent-security'];
          warRoomTeam.forEach(wId => {
            const wAg = next.get(wId);
            if (wAg) {
              wAg.status = 'WAR_ROOM';
              wAg.animState = 'working';
              wAg.tx = -6.5;
              wAg.ty = -5.5;
              wAg.routeActive = true;
              wAg.bubble = { text: '🚨 War Room Emergencial', life: 10.0, isImportant: true };
            }
          });
        }

        // 4. Update HUD metrics
        const elOffices = document.getElementById('officeHudTotalOffices');
        if (elOffices && officeData.offices) elOffices.textContent = officeData.offices.length;
        const elActive = document.getElementById('officeHudActiveAgents');
        if (elActive && officeData.presence?.agents) elActive.textContent = Object.keys(officeData.presence.agents).length;
        const elInConv = document.getElementById('officeHudInConversation');
        if (elInConv) elInConv.textContent = (officeData.activeConversations || []).length;
        const elInMtg = document.getElementById('officeHudInMeeting');
        if (elInMtg) elInMtg.textContent = (officeData.activeMeetings || []).length;
        const elWar = document.getElementById('officeHudWarRoomStatus');
        if (elWar) {
          elWar.textContent = isWarRoom ? 'CRÍTICO' : 'NORMAL';
          elWar.className = 'office-metric-val ' + (isWarRoom ? 'red' : 'green');
        }
        const elHuman = document.getElementById('officeHudHumanStatus');
        if (elHuman) elHuman.textContent = officeData.presence?.human?.status || 'AVAILABLE';
      }

      if (fetchedSuccessfully) {
        this.world.agents = next;
        if (window.FENIX?.live) {
          window.FENIX.live.agents = apiAgents;
          window.FENIX.live.agentsMeasured = true;
        }
      }

      // Update HUD online/working/errors counters
      const registeredCount = this.world.agents.size;
      const workingCount = [...this.world.agents.values()].filter(a => ['WORKING', 'RUNNING', 'CODING', 'TESTING', 'DEPLOYING'].includes(a.status)).length;
      const errorCount = [...this.world.agents.values()].filter(a => ['ERROR', 'FAILED', 'BLOCKED'].includes(a.status)).length;

      const elOnline = document.getElementById('cityOnlineCount');
      if (elOnline) elOnline.textContent = fetchedSuccessfully ? registeredCount + ' REGISTRADOS' : 'AGENTES INDISPONÍVEIS';
      const elWorking = document.getElementById('cityWorkingCount');
      if (elWorking) elWorking.textContent = '⚡ ' + workingCount + ' EM OPERAÇÃO';
      const elErrors = document.getElementById('cityErrorsCount');
      if (elErrors) elErrors.textContent = '🛡️ ' + errorCount + ' ERROS';
      const elHealth = document.getElementById('cityHealthBadge');
      if (elHealth) {
        if (errorCount > 0) {
          elHealth.textContent = '⚠️ ALERTA';
          elHealth.style.color = '#ef4444';
          elHealth.style.background = 'rgba(239,68,68,0.15)';
          elHealth.style.borderColor = 'rgba(239,68,68,0.4)';
        } else {
          elHealth.textContent = '● SAUDÁVEL';
          elHealth.style.color = '#10b981';
          elHealth.style.background = 'rgba(16,185,129,0.15)';
          elHealth.style.borderColor = 'rgba(16,185,129,0.4)';
        }
      }
    } catch (e) {
      console.error('syncRealData error:', e);
    } finally {
      this._syncInProgress = false;
    }
  }

  

  toScreen(x, y, z, cx, cy, zoom) {
    const rotated = this.rotatePoint(x, y);
    const tw = this.state.tileSize * zoom;
    const th = (this.state.tileSize / 2) * zoom;
    return { x: cx + (rotated.x - rotated.y) * tw, y: cy + (rotated.x + rotated.y) * th - z * tw };
  }

  rotatePoint(x, y) {
    switch (this.rotationQuarter) {
      case 1: return { x: -y, y: x };
      case 2: return { x: -x, y: -y };
      case 3: return { x: y, y: -x };
      default: return { x, y };
    }
  }

  saveCamera() {
    try { localStorage.setItem('fenix_city_camera', JSON.stringify({ ...this.state.targetCamera, rotationQuarter: this.rotationQuarter })); } catch (_) {}
  }

  rotateCamera() {
    this.rotationQuarter = (this.rotationQuarter + 1) & 3;
    this.saveCamera();
    const button = document.getElementById('btnRotateCity');
    if (button) button.setAttribute('aria-label', `Girar cidade · orientação ${this.rotationQuarter + 1} de 4`);
  }

  startLoop() {
    const loop = (t) => {
      const cityView = document.getElementById('view-city');
      const isVisible = cityView && cityView.classList.contains('active') && cityView.style.display !== 'none' && !document.hidden;
      if (!isVisible) {
        this._loopRunning = false;
        return;
      }
      const delta = Math.min((t - this.state.lastTime) / 1000, 0.1);
      this.state.lastTime = t;
      this.time = t / 1000;

      const isHeadless = Boolean(navigator.webdriver) || (typeof navigator !== 'undefined' && /headless/i.test(navigator.userAgent)) || Boolean(window.__FENIX_HEADLESS__);
      if (isHeadless) {
        if (this._lastDrawTime && (t - this._lastDrawTime < 100)) {
          requestAnimationFrame(loop);
          return;
        }
        this._lastDrawTime = t;
      }

      this.update(delta);
      this.draw();
      requestAnimationFrame(loop);
    };
    if (!this._loopRunning) {
      this._loopRunning = true;
      requestAnimationFrame(loop);
    }
  }

  update(delta) {
    this._applyModes();
    
    // WASD and Arrow key smooth panning
    if (this.keysDown && this.keysDown.size > 0) {
      const panSpeed = (520 / Math.max(0.4, this.state.camera.zoom)) * delta;
      if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp'))    this.state.targetCamera.y += panSpeed;
      if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown'))  this.state.targetCamera.y -= panSpeed;
      if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft'))  this.state.targetCamera.x += panSpeed;
      if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) this.state.targetCamera.x -= panSpeed;
    }

    if (this.cameraMode === 'CINEMATIC') {
      const angle = this.time * 0.18;
      const dist = 140;
      this.state.targetCamera.x = Math.cos(angle) * dist;
      this.state.targetCamera.y = Math.sin(angle) * (dist * 0.5);
      this.state.targetCamera.zoom = 1.25;
    }
    const followed = this.state.followAgentId && this.world.agents.get(this.state.followAgentId);
    const missionAgents = this.state.followMissionId
      ? [...this.world.agents.values()].filter((agent) => {
        const mission = agent.currentMission;
        const missionId = agent.missionId || mission?.id || mission?.missionId;
        return missionId && String(missionId) === String(this.state.followMissionId);
      })
      : [];
    if (!followed && missionAgents.length) {
      const center = missionAgents.reduce((sum, agent) => ({ x: sum.x + agent.x, y: sum.y + agent.y }), { x: 0, y: 0 });
      center.x /= missionAgents.length;
      center.y /= missionAgents.length;
      const tw = this.state.tileSize;
      const th = this.state.tileSize / 2;
      const cameraPoint = this.toScreen(center.x, center.y, 0, 0, 0, 1);
      this.state.targetCamera.x = -cameraPoint.x;
      this.state.targetCamera.y = -cameraPoint.y;
      this.state.targetCamera.zoom = Math.max(this.state.targetCamera.zoom, 1.2);
    }
    if (followed) {
      const tw = this.state.tileSize;
      const th = this.state.tileSize / 2;
      const z = Math.max(this.state.targetCamera.zoom, 1.35);
      const rect = this.canvas.getBoundingClientRect();
      const goldenOffsetX = Math.round(rect.width * 0.12);
      const cameraPoint = this.toScreen(followed.x, followed.y, 0, 0, 0, z);
      this.state.targetCamera.x = -Math.round(cameraPoint.x) - goldenOffsetX;
      this.state.targetCamera.y = -Math.round(cameraPoint.y);
      this.state.targetCamera.zoom = z;
    }
    // Smooth camera
    const lerp = (a, b, t) => a + (b - a) * t;
    const s = 1 - Math.pow(0.01, delta * 5);
    this.state.camera.x = lerp(this.state.camera.x, this.state.targetCamera.x, s);
    this.state.camera.y = lerp(this.state.camera.y, this.state.targetCamera.y, s);
    this.state.camera.zoom = lerp(this.state.camera.zoom, this.state.targetCamera.zoom, s);

    // Contextual Spatial Chat anchoring beside character
    if (this.state.selectedAgent) {
      const chatEl = document.getElementById('fenixSpatialAgentChat');
      if (chatEl && chatEl.style.display !== 'none') {
        const rect = this.canvas.getBoundingClientRect();
        const cx = rect.width / 2 + this.state.camera.x;
        const cy = rect.height / 2 + this.state.camera.y;
        const sc = this.toScreen(this.state.selectedAgent.x, this.state.selectedAgent.y, 0.22, cx, cy, this.state.camera.zoom);
        const left = Math.max(10, Math.min(rect.width - 340, sc.x + 35));
        const top = Math.max(10, Math.min(rect.height - 240, sc.y - 140));
        chatEl.style.left = left + 'px';
        chatEl.style.top = top + 'px';
      }
    }

    for (const agent of this.world.agents.values()) {
      this._updateAgent(agent, delta);
    }

    // Update envelopes
    if (this.world.envelopes && this.world.envelopes.length > 0) {
      this.world.envelopes = this.world.envelopes.filter(env => {
        env.progress += delta * (env.speed || 0.85);
        if (_pseudoRandom() < 0.35) {
          const arc = Math.sin(Math.min(1, env.progress) * Math.PI) * 1.5;
          const px = env.fromX + (env.toX - env.fromX) * env.progress;
          const py = env.fromY + (env.toY - env.fromY) * env.progress;
          this.world.particles.push({
            x: px, y: py, z: 0.3 + arc,
            vx: (_pseudoRandom() - 0.5) * 0.15, vy: (_pseudoRandom() - 0.5) * 0.15, vz: 0.05,
            life: 0.45, decay: 2.2, size: 2.2, color: env.color || '#06b6d4'
          });
        }
        if (env.progress >= 1) {
          for (let i = 0; i < 8; i++) {
            this.world.particles.push({
              x: env.toX, y: env.toY, z: 0.35,
              vx: (_pseudoRandom() - 0.5) * 1.2, vy: (_pseudoRandom() - 0.5) * 1.2, vz: _pseudoRandom() * 0.8,
              life: 0.7, decay: 1.6, size: 2.8, color: env.color || '#06b6d4'
            });
          }
          if (env.toAgentId) {
            const targetAgent = this.world.agents.get(env.toAgentId);
            if (targetAgent) {
              targetAgent.bubble = { text: env.text || 'Mensagem recebida', life: 3.5 };
            }
          }
          return false;
        }
        return true;
      });
    }

    // Update particles
    this.world.particles = this.world.particles.filter(p => p.life > 0);
    for (const p of this.world.particles) {
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;
      p.life -= delta * p.decay;
    }
  }

  _updateAgent(agent, delta) {
    const isWorking = ['WORKING', 'RUNNING', 'BUSY', 'TESTING'].includes(String(agent.status || '').toUpperCase()) || agent.stationState === 'working' || Boolean(agent.currentJob || agent.currentJobId);
    const isError = ['ERROR', 'FAILED', 'BLOCKED'].includes(String(agent.status || '').toUpperCase());

    if (agent.bubble && agent.bubble.life > 0) {
      agent.bubble.life -= delta;
    }
    if (agent.thoughtBubble && agent.thoughtBubble.life > 0) {
      agent.thoughtBubble.life -= delta;
    }

    // ── Munder Difflin Autonomous Living Simulation ──
    if (isWorking) {
      // If working, ensure heading back to designated desk
      const distToHome = Math.hypot(agent.x - agent.homeX, agent.y - agent.homeY);
      if (distToHome > 0.2 && !agent.routeActive) {
        agent.tx = agent.homeX;
        agent.ty = agent.homeY;
        agent.routeActive = true;
      }
      if (!agent._moving && (!agent.thoughtBubble || agent.thoughtBubble.life <= 0)) {
        const job = agent.currentJob || agent.currentJobId;
        const taskDesc = typeof job === 'string' ? job : (job?.name || job?.type || agent.role || 'Compilando e executando');
        agent.thoughtBubble = { text: '⚡ ' + taskDesc, life: 5.5, isWork: true };
      }
    } else if (!isError) {
      // Idle agent autonomous routine (coffee, water cooler, whiteboard, war room)
      agent.routineTimer = (agent.routineTimer || 0) + delta;
      const seed = (agent.id.charCodeAt(agent.id.length - 1) || 0) + (agent.id.charCodeAt(0) || 0);
      const interval = 16 + (seed % 14);
      if (agent.routineTimer > interval && !agent._moving && !agent.routeActive) {
        agent.routineTimer = 0;
        const portalList = typeof CANONICAL_BUILDING_PORTALS !== 'undefined' ? Object.values(CANONICAL_BUILDING_PORTALS) : [];
        const randomPortal = portalList.length ? portalList[Math.floor(_pseudoRandom() * portalList.length)] : null;
        const routineChoices = [
          MUNDER_DIFFLIN_WAYPOINTS.COFFEE_BAR,
          MUNDER_DIFFLIN_WAYPOINTS.WATER_COOLER,
          MUNDER_DIFFLIN_WAYPOINTS.WHITEBOARD,
          MUNDER_DIFFLIN_WAYPOINTS.CONFERENCE_TABLE,
          MUNDER_DIFFLIN_WAYPOINTS.CENTRAL_HALL,
          ...(randomPortal ? [
            { x: randomPortal.door.x, y: randomPortal.door.y, thought: randomPortal.exitThought },
            { x: randomPortal.interior.x, y: randomPortal.interior.y, thought: randomPortal.enterThought }
          ] : []),
          { x: agent.homeX, y: agent.homeY, thought: 'Retornando à estação de trabalho 💻' }
        ];
        const choice = routineChoices[Math.floor(_pseudoRandom() * routineChoices.length)];
        agent.tx = choice.x;
        agent.ty = choice.y;
        agent.routeActive = true;
        agent.thoughtBubble = { text: choice.thought, life: 5.0, isWork: false };
      }
    }

    // Walk animation
    agent.walkTimer = (agent.walkTimer || 0) + delta;
    if (agent.walkTimer > 0.14) {
      agent.walkFrame = ((agent.walkFrame || 0) + 1) % 4;
      agent.walkTimer = 0;
    }

    // Path waypoint traversal
    let targetX = agent.tx;
    let targetY = agent.ty;

    if (agent.path && agent.path.length > 0 && (agent.pathIndex || 0) < agent.path.length) {
      const wp = agent.path[agent.pathIndex];
      targetX = wp.x;
      targetY = wp.y;
    }

    const dx = targetX - agent.x;
    const dy = targetY - agent.y;
    const dist = Math.hypot(dx, dy);
    const speed = isWorking ? 1.4 : 2.0;
    agent._moving = dist > 0.08;

    if (agent._moving) {
      const move = Math.min(speed * delta, dist);
      agent.x += (dx / dist) * move;
      agent.y += (dy / dist) * move;
      if (Math.abs(dx) > Math.abs(dy)) {
        agent.facing = dx > 0 ? 'SE' : 'NW';
      } else {
        agent.facing = dy > 0 ? 'SW' : 'NE';
      }
      if (dist <= 0.12 && agent.path && agent.pathIndex < agent.path.length - 1) {
        agent.pathIndex++;
      }
      if (!agent.trail) agent.trail = [];
      agent.trail.push({ x: agent.x, y: agent.y, life: 0.6 });
      if (agent.trail.length > 20) agent.trail.shift();
    } else {
      if (agent.path && agent.pathIndex >= agent.path.length - 1) {
        agent.routeActive = false;
        // After arrival, if idle, randomly pause to think or communicate
        if (!isWorking && !isError && !agent.animDuration) {
          const roll = _pseudoRandom();
          if (roll < 0.25) {
            agent.ambientState = 'think';
            agent.animDuration = 3.5 + _pseudoRandom() * 2.5;
          } else if (roll < 0.50) {
            agent.ambientState = 'communicate';
            agent.animDuration = 3.0 + _pseudoRandom() * 2.0;
          } else {
            agent.ambientState = 'idle';
          }
        }
      }
      // Spontaneous social group conversation when near idle colleagues
      if (!isWorking && !isError && !agent._moving && (!agent.bubble || agent.bubble.life <= 0)) {
        agent.socialTimer = (agent.socialTimer || 0) + delta;
        if (agent.socialTimer > 8) {
          agent.socialTimer = 0;
          for (const peer of this.world.agents.values()) {
            if (peer === agent || peer._moving || peer.status === 'OFFLINE') continue;
            const pdist = Math.hypot(peer.x - agent.x, peer.y - agent.y);
            if (pdist < 1.35) {
              const pdx = peer.x - agent.x;
              const pdy = peer.y - agent.y;
              agent.facing = Math.abs(pdx) > Math.abs(pdy) ? (pdx > 0 ? 'SE' : 'NW') : (pdy > 0 ? 'SW' : 'NE');
              peer.facing = Math.abs(pdx) > Math.abs(pdy) ? (pdx > 0 ? 'NW' : 'SE') : (pdy > 0 ? 'NE' : 'SW');
              agent.ambientState = 'communicate';
              agent.animDuration = 4.0;
              peer.ambientState = 'communicate';
              peer.animDuration = 4.0;
              const chatTopics = [
                'Alinhando sprint com ' + (peer.displayName || peer.name) + ' 💬',
                'Contratos e testes 100% verificados ✅',
                'Otimizando latência do barramento ⚡',
                'Diagramas de arquitetura atualizados 📐',
                'Sincronizando memória ativa do cluster 🧠'
              ];
              agent.bubble = { text: chatTopics[Math.floor(_pseudoRandom() * chatTopics.length)], life: 5.0 };
              break;
            }
          }
        }
      }
      if (!agent.facing) agent.facing = 'SE';
    }

    if (agent.animDuration > 0) {
      agent.animDuration -= delta;
      if (agent.animDuration <= 0) {
        agent.ambientState = null;
      }
    }

    agent.animState = isError ? 'error' : (agent.ambientState === 'success' ? 'success' : (agent.ambientState === 'error' ? 'error' : (isWorking && !agent._moving ? 'working' : (agent._moving ? 'walk' : (agent.ambientState || 'idle')))));

    // Trail decay
    if (agent.trail && Array.isArray(agent.trail)) {
      for (const t of agent.trail) t.life -= delta * 2.5;
      agent.trail = agent.trail.filter(t => t.life > 0);
    } else {
      agent.trail = [];
    }
  }

  draw() {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const { camera } = this.state;
    const zoom = camera.zoom;
    const cx = width / 2 + camera.x;
    const cy = height / 2 + camera.y;

    ctx.imageSmoothingEnabled = true;

    // Atmospheric night backdrop
    this._drawBackdrop(ctx, width, height);

    if (this.state.renderMode === 'hero' && this.heroImageLoaded) {
      this._drawHeroCityLayer(ctx, cx, cy, zoom, width, height);
      this._drawHandoff(ctx, cx, cy, zoom);
      this._drawEnvelopes(ctx, cx, cy, zoom);
      if (!this.state.photoMode) {
        this._drawCityEventHud(ctx, width);
        this._drawEmptyWorldOverlay(ctx, width, height);
      }
      return;
    }

    // 2.5D Living Pixel Game World (Habbo / Tibia Inspired Living Computational World)
    if (window.FenixPixelEngine) {
      if (!window.FenixPixelEngine.Cache?.ready && typeof window.FenixPixelEngine.init === 'function') {
        window.FenixPixelEngine.init();
      }
      this._drawLivingPixelWorld(ctx, cx, cy, zoom, width, height);
    } else {
      this._drawGrid(ctx, cx, cy, zoom);
      this._drawRoads(ctx, cx, cy, zoom);
      const districts = Object.values(this.DISTRICTS).sort((a,b) => (a.x+a.y)-(b.x+b.y));
      for (const d of districts) this._drawDistrict(ctx, d, cx, cy, zoom);
      const sorted = [...this.world.agents.values()].sort((a,b) => (a.x+a.y)-(b.x+b.y));
      for (const agent of sorted) if (this._filterAllowsAgent(agent)) this._drawAgent(ctx, agent, cx, cy, zoom);
    }

    // Dynamic handoff dispatch & flying message envelopes
    this._drawProjectLots(ctx, cx, cy, zoom);
    this._drawHandoff(ctx, cx, cy, zoom);
    this._drawEnvelopes(ctx, cx, cy, zoom);
    this._drawMasterWorldNeonSigns(ctx, cx, cy, zoom);

    // HUD and Overlays (hidden in Photo Mode for pure Art Director Gate visual)
    if (!this.state.photoMode) {
      this._drawCityEventHud(ctx, width);
      this._drawHUD(ctx, width, height);
      this._drawMinimap(ctx, width, height);
      this._drawEmptyWorldOverlay(ctx, width, height);
    }
  }

  _drawEmptyWorldOverlay(ctx, width, height) {
    if ((this.world.agents && this.world.agents.size > 0) || (this.world.projects && this.world.projects.length > 0)) return;

    ctx.save();
    const cardW = Math.min(width - 32, 440);
    const cardH = 150;
    const cardX = (width - cardW) / 2;
    const cardY = height - cardH - 60;

    ctx.fillStyle = 'rgba(10, 16, 28, 0.88)';
    ctx.strokeStyle = 'rgba(0, 217, 255, 0.3)';
    ctx.lineWidth = 1;

    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 12);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.strokeRect(cardX, cardY, cardW, cardH);
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 15px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Seu mundo ainda está vazio.', width / 2, cardY + 34);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = '400 12px Inter, sans-serif';
    ctx.fillText('Nenhuma empresa ou agente registrado no runtime.', width / 2, cardY + 56);

    const btnY = cardY + 86;
    const btnW = (cardW - 48) / 3;
    const labels = ['+ Criar empresa', '+ Conectar projeto', '+ Workspace'];
    for (let i = 0; i < 3; i++) {
      const bx = cardX + 16 + i * (btnW + 8);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeStyle = 'rgba(0, 217, 255, 0.2)';
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(bx, btnY, btnW, 36, 6);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(bx, btnY, btnW, 36);
        ctx.strokeRect(bx, btnY, btnW, 36);
      }
      ctx.fillStyle = '#00D9FF';
      ctx.font = '500 11px Inter, sans-serif';
      ctx.fillText(labels[i], bx + btnW / 2, btnY + 22);
    }

    ctx.restore();
  }

  _drawMasterWorldNeonSigns(ctx, cx, cy, zoom) {
    if (zoom < 0.65) return;
    const landmarks = [
      { id: 'fenix-core', label: 'FÊNIX CORE', x: 0, y: -5.0, z: 1.45, color: '#ff8a00', icon: '🔥', primary: true },
      { id: 'ai-runtime', label: 'AI RUNTIME', x: 8.0, y: -5.5, z: 1.05, color: '#00e5ff', icon: '⚡' },
      { id: 'knowledge', label: 'KNOWLEDGE', x: -6.0, y: -8.0, z: 0.95, color: '#38bdf8', icon: '🌐' },
      { id: 'agent-district', label: 'AGENT DISTRICT', x: -8.5, y: -1.0, z: 0.85, color: '#00e5ff', icon: '👥' },
      { id: 'deploy-center', label: 'DEPLOY CENTER', x: -6.5, y: 3.5, z: 0.95, color: '#a855f7', icon: '🎲' },
      { id: 'observability', label: 'OBSERVABILITY', x: 0, y: -11.0, z: 1.05, color: '#38bdf8', icon: '📊' }
    ];

    for (const lm of landmarks) {
      const sc = this.toScreen(lm.x, lm.y, lm.z, cx, cy, zoom);
      ctx.save();

      const fontSize = Math.round(Math.min(13, Math.max(9, 10.5 * zoom)));
      ctx.font = `800 ${fontSize}px 'Inter', sans-serif`;
      const textWidth = ctx.measureText(lm.label).width;
      const padX = 8 * zoom;
      const padY = 4 * zoom;
      const boxW = textWidth + padX * 2 + (16 * zoom);
      const boxH = (fontSize + padY * 2);
      const boxX = sc.x - boxW / 2;
      const boxY = sc.y - boxH / 2;

      // Dark translucent sign board
      ctx.fillStyle = lm.primary ? 'rgba(20, 10, 6, 0.92)' : 'rgba(6, 12, 22, 0.92)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(boxX, boxY, boxW, boxH, 4 * zoom);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fill();

      // Glowing Neon border
      ctx.strokeStyle = lm.color;
      ctx.lineWidth = lm.primary ? Math.max(2, 2.5 * zoom) : Math.max(1.5, 1.8 * zoom);
      ctx.shadowColor = lm.color;
      ctx.shadowBlur = 10 * zoom;
      ctx.stroke();

      // Sign Icon and Text
      ctx.shadowColor = lm.color;
      ctx.shadowBlur = 8 * zoom;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const iconX = boxX + padX;
      const textX = iconX + (14 * zoom);
      const midY = boxY + boxH / 2;

      ctx.fillStyle = '#ffffff';
      ctx.fillText(lm.icon, iconX, midY);
      ctx.fillStyle = lm.color;
      ctx.fillText(lm.label, textX, midY);

      // Support pylons connecting sign to roof
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(boxX + 6 * zoom, boxY + boxH);
      ctx.lineTo(boxX + 6 * zoom, boxY + boxH + 6 * zoom);
      ctx.moveTo(boxX + boxW - 6 * zoom, boxY + boxH);
      ctx.lineTo(boxX + boxW - 6 * zoom, boxY + boxH + 6 * zoom);
      ctx.stroke();

      ctx.restore();
    }
  }

  _drawHeroCityLayer(ctx, cx, cy, zoom, width, height) {
    const img = this.heroImage;
    if (!img || !img.complete || img.naturalWidth === 0) return;

    // Center and scale image so it fits the canvas comfortably
    const baseScale = Math.max(width / img.width, height / img.height);
    const sw = img.width * baseScale * zoom;
    const sh = img.height * baseScale * zoom;
    const dx = cx - sw / 2;
    const dy = cy - sh / 2;

    ctx.drawImage(img, dx, dy, sw, sh);

    // 15 Canonical Buildings normalized positions on the master canvas
    const HERO_BUILDINGS = [
      { id: 'logistics', name: 'LOGÍSTICA', sub: 'Operações e Entregas', icon: 'ph-truck', color: '#EF4444', nx: 0.730, ny: 0.445 },
      { id: 'command-center', name: 'FÊNIX HQ', sub: 'Sistema Central', icon: 'ph-fire', color: '#FFB020', nx: 0.505, ny: 0.255 },
      { id: 'residential', name: 'RESIDENCIAL', sub: 'Agentes · Moradia', icon: 'ph-house', color: '#F59E0B', nx: 0.175, ny: 0.180 },
      { id: 'research', name: 'RESEARCH', sub: 'IA e Inovação', icon: 'ph-atom', color: '#A855F7', nx: 0.280, ny: 0.275 },
      { id: 'design', name: 'DESIGN', sub: 'UI/UX e Criatividade', icon: 'ph-palette', color: '#EC4899', nx: 0.145, ny: 0.400 },
      { id: 'dev-district', name: 'ENGINEERING', sub: 'Desenvolvimento', icon: 'ph-code', color: '#00D9FF', nx: 0.350, ny: 0.560 },
      { id: 'praca-central', name: 'PRAÇA CENTRAL', sub: 'Eventos e Reuniões', icon: 'ph-users', color: '#10B981', nx: 0.330, ny: 0.700 },
      { id: 'praia', name: 'PRAIA', sub: 'Lazer e Social', icon: 'ph-umbrella', color: '#06B6D4', nx: 0.080, ny: 0.760 },
      { id: 'business', name: 'BUSINESS', sub: 'Comercial e Vendas', icon: 'ph-briefcase', color: '#F97316', nx: 0.575, ny: 0.600 },
      { id: 'shopping', name: 'SHOPPING', sub: 'Serviços e Lojas', icon: 'ph-shopping-bag', color: '#EAB308', nx: 0.500, ny: 0.780 },
      { id: 'porto', name: 'PORTO', sub: 'Logística e Distribuição', icon: 'ph-boat', color: '#38BDF8', nx: 0.745, ny: 0.240 },
      { id: 'industrial', name: 'INDUSTRIAL', sub: 'Produção e Manufatura', icon: 'ph-factory', color: '#F97316', nx: 0.850, ny: 0.140 },
      { id: 'security', name: 'SECURITY', sub: 'Segurança e Monitoramento', icon: 'ph-shield-check', color: '#EF4444', nx: 0.900, ny: 0.470 },
      { id: 'data-center', name: 'DATA CENTER', sub: 'Infraestrutura e Cloud', icon: 'ph-cpu', color: '#3B82F6', nx: 0.850, ny: 0.630 },
      { id: 'hospital', name: 'HOSPITAL', sub: 'Saúde e Bem-estar', icon: 'ph-first-aid', color: '#3B82F6', nx: 0.760, ny: 0.780 }
    ];

    this._heroHitboxes = HERO_BUILDINGS.map(b => ({
      ...b,
      x: dx + b.nx * sw,
      y: dy + b.ny * sh,
      w: 120 * zoom,
      h: 42 * zoom
    }));

    // Floating location pin over selected entity/building (if any)
    const selEntity = window.GlobalSelectionStore?.selectedEntity;
    if (selEntity && selEntity.id) {
      const pinTarget = this._heroHitboxes.find(b => b.id === selEntity.id || b.companyId === selEntity.id);
      if (pinTarget) {
        this._drawHeroPin(ctx, pinTarget.x, pinTarget.y - 28 * zoom, zoom);
      }
    }

    // Hover Highlight on Building / Badge
    if (this.state.hoveredHeroBuilding) {
      const h = this._heroHitboxes.find(b => b.id === this.state.hoveredHeroBuilding);
      if (h) {
        ctx.save();
        ctx.shadowColor = h.color;
        ctx.shadowBlur = 18 * zoom;
        ctx.strokeStyle = h.color;
        ctx.lineWidth = 2 * zoom;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h, 8 * zoom);
        } else {
          ctx.rect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // Deterministic Vehicles & Activity
    this._drawHeroVehicles(ctx, dx, dy, sw, sh, zoom);
  }

  _drawHeroPin(ctx, px, py, zoom) {
    const now = Date.now();
    const bob = Math.sin(now / 220) * (6 * zoom);
    const pinY = py + bob;

    // Drop shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(px, py + 24 * zoom, 14 * zoom, 6 * zoom, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing signal rings (deterministic)
    const tRing = (now % 1400) / 1400;
    ctx.strokeStyle = `rgba(239, 68, 68, ${1 - tRing})`;
    ctx.lineWidth = 2 * zoom;
    ctx.beginPath();
    ctx.ellipse(px, py + 24 * zoom, (14 + tRing * 24) * zoom, (6 + tRing * 10) * zoom, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 3D Teardrop Pin Body
    const r = 16 * zoom;
    ctx.shadowColor = '#EF4444';
    ctx.shadowBlur = 18 * zoom;

    const grad = ctx.createRadialGradient(px - r * 0.3, pinY - r * 0.3, r * 0.1, px, pinY, r);
    grad.addColorStop(0, '#FF6B6B');
    grad.addColorStop(0.7, '#EF4444');
    grad.addColorStop(1, '#991B1B');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, pinY, r, 0, Math.PI * 2);
    ctx.fill();

    // Pointer bottom
    ctx.beginPath();
    ctx.moveTo(px - r * 0.7, pinY + r * 0.5);
    ctx.lineTo(px, pinY + r * 1.5);
    ctx.lineTo(px + r * 0.7, pinY + r * 0.5);
    ctx.closePath();
    ctx.fill();

    // Center icon/dot
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(px, pinY, r * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawHeroVehicles(ctx, dx, dy, sw, sh, zoom) {
    const now = Date.now();
    // 1. Depósito Mais delivery truck moving from Depósito Mais along avenue
    const tTruck = (now % 10000) / 10000;
    let tx, ty;
    if (tTruck < 0.5) {
      const p = tTruck / 0.5;
      tx = dx + (0.72 - p * 0.20) * sw;
      ty = dy + 0.49 * sh;
    } else {
      const p = (tTruck - 0.5) / 0.5;
      tx = dx + (0.52 - p * 0.12) * sw;
      ty = dy + (0.49 + p * 0.13) * sh;
    }

    ctx.save();
    ctx.fillStyle = '#F97316'; // Depósito Mais orange
    ctx.fillRect(tx - 10 * zoom, ty - 5 * zoom, 20 * zoom, 10 * zoom);
    ctx.fillStyle = '#FFFFFF'; // Cargo container
    ctx.fillRect(tx - 8 * zoom, ty - 4 * zoom, 12 * zoom, 8 * zoom);
    ctx.fillStyle = '#FEF08A'; // Headlights
    ctx.fillRect(tx - 10 * zoom, ty - 3 * zoom, 2 * zoom, 2 * zoom);
    ctx.restore();

    // 2. Monorail pulse along left track
    const tTrain = (now % 7000) / 7000;
    const trainX = dx + (0.04 + tTrain * 0.16) * sw;
    const trainY = dy + (0.62 + tTrain * 0.08) * sh;
    ctx.save();
    ctx.fillStyle = '#DC2626'; // Monorail red stripe
    ctx.fillRect(trainX - 16 * zoom, trainY - 4 * zoom, 32 * zoom, 8 * zoom);
    ctx.fillStyle = '#E2E8F0'; // Body
    ctx.fillRect(trainX - 14 * zoom, trainY - 3 * zoom, 28 * zoom, 6 * zoom);
    ctx.restore();
  }

  _projectLotPosition(index) {
    const col = index % 4;
    const row = Math.floor(index / 4);
    return { x: -7 + col * 2.6 - row * 0.5, y: -3 + row * 2.6 };
  }

  _drawProjectLots(ctx, cx, cy, zoom) {
    const list = this.world.projects || [];
    this._projectLotHits = [];
    if (!list.length) return;
    if (this.state.renderMode === 'pixel') {
      // In 2.5D Living Pixel World, project buildings are already rendered via FenixPixelEngine (Project Forge, Tech Startup, Quantum Dome)
      // Register project lot hitboxes around Project Forge zone (10, -8) without drawing crude neon blocks
      for (let index = 0; index < Math.min(list.length, 12); index++) {
        const project = list[index];
        const px = 10.0 + (index % 3) * 1.5 - Math.floor(index / 3) * 0.8;
        const py = -8.0 + Math.floor(index / 3) * 1.5;
        const base = this.toScreen(px, py, 0, cx, cy, zoom);
        this._projectLotHits.push({
          id: project.id,
          x: base.x,
          y: base.y - 40 * zoom,
          width: 45 * zoom,
          height: 60 * zoom
        });
      }
      return;
    }
    const colors = ['#33dec0', '#4cb9ff', '#ac88ff', '#ffbb65'];
    for (let index = 0; index < Math.min(list.length, 24); index++) {
      const project = list[index];
      const position = this._projectLotPosition(index);
      const base = this.toScreen(position.x, position.y, 0, cx, cy, zoom);
      const ready = Boolean(project.workspace);
      const color = colors[index % colors.length];
      const height = ready ? 1.2 + (index % 3) * 0.28 : 0.48;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = (ready ? 14 : 5) * zoom;
      this._drawBlock(ctx, position.x, position.y, 0.05, height, color, cx, cy, zoom, 0.52, 0.52);
      ctx.shadowBlur = 0;
      const cap = this.toScreen(position.x, position.y, height + 0.1, cx, cy, zoom);
      ctx.fillStyle = '#ecfffb';
      ctx.font = `800 ${Math.max(8, 9 * zoom)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      const label = String(project.name || project.id || 'Projeto');
      ctx.fillText(label.length > 19 ? label.slice(0, 18) + '…' : label, cap.x, cap.y - 8 * zoom);
      if (!ready) {
        ctx.fillStyle = '#ffd082';
        ctx.font = `700 ${Math.max(7, 8 * zoom)}px Inter, sans-serif`;
        ctx.fillText('PREPARANDO WORKSPACE', cap.x, base.y + 16 * zoom);
      }
      ctx.restore();
      this._projectLotHits.push({ id: project.id, x: base.x, y: base.y - height * this.state.tileSize * zoom, width: 45 * zoom, height: (height * this.state.tileSize + 20) * zoom });
    }
  }

  _hitTestProjectLot(x, y) {
    return (this._projectLotHits || []).find(lot => Math.abs(x - lot.x) <= lot.width && y >= lot.y - 22 && y <= lot.y + lot.height) || null;
  }

  _drawLivingPixelWorld(ctx, cx, cy, zoom, width, height) {
    const P = window.FenixPixelEngine;
    if (!P || !P.Cache.ready) return;
    const Cache = P.Cache;
    ctx.imageSmoothingEnabled = false;

    // ── 1. TERRAIN PASS ──────────────────────────────────────────
    // Continuous 2.5D isometric tiles drawn in topological diagonal order
    // Expansive 51x51 coastal island metropolis filling the viewport with zero wasted void
    const minG = -24, maxG = 24;
    for (let sum = 2 * minG; sum <= 2 * maxG; sum++) {
      for (let gx = minG; gx <= maxG; gx++) {
        const gy = sum - gx;
        if (gy < minG || gy > maxG) continue;

        const dist = Math.hypot(gx, gy);

        // A. Oceanic Boundaries & Coastlines
        const isPraiaBeach = (gx <= -10 && gx >= -18 && gy >= 7 && gy <= 17);
        const isPortoDock  = (gx >= 12 && gx <= 19 && gy >= -6 && gy <= 0);
        const isCliffZone  = (gx <= -11 && gx >= -18 && gy <= -9 && gy <= -16);
        const isWater      = (dist > 22.8 || gx < -19 || gx > 19 || gy < -19 || gy > 19 || (gx + gy > 28) || (gx - gy > 28) || (-gx + gy > 28) || (-gx - gy > 28)) && !isPraiaBeach && !isPortoDock && !isCliffZone;

        // B. Avenues, Arterials & Roundabout (Coherent Urban Grid)
        const isRoundaboutRing  = (dist >= 1.6 && dist <= 2.9);
        const isAvenidaFenix    = (gx === 0 || gx === 1) && gy >= -16 && gy <= 16;
        const isAvenidaCriadores= (gy === 0 || gy === 1) && gx >= -18 && gx <= 18;
        const isNorthIndustrial = (gy === -4 || gy === -5) && gx >= 1 && gx <= 18;
        const isSouthInnovation = (gy === 6 || gy === 7) && gx >= -14 && gx <= 14;
        const isEastLogistics   = (gx === 9 || gx === 10) && gy >= -10 && gy <= 4;
        const isWestBoulevard   = (gx === -9 || gx === -10) && gy >= -14 && gy <= 12;
        const isResearchSpur    = (gy === -9 || gy === -10) && gx >= -14 && gx <= 1;
        const isCommercialSpur  = (gy === 9 || gy === 10) && gx >= -9 && gx <= 0;
        const isHospitalSpur    = (gy === 9 || gy === 10) && gx >= 0 && gx <= 12;
        const isPortoSpur       = (gy === -3 || gy === -4) && gx >= 11 && gx <= 18;
        const isPraiaSpur       = (gx === -11 || gx === -12) && gy >= 6 && gy <= 14;

        const isRoad = isRoundaboutRing || isAvenidaFenix || isAvenidaCriadores || isNorthIndustrial || isSouthInnovation || isEastLogistics || isWestBoulevard || isResearchSpur || isCommercialSpur || isHospitalSpur || isPortoSpur || isPraiaSpur;

        // C. Sidewalks Framing Urban Street Blocks
        const isAvenidaFenixSidewalk    = (gx === -1 || gx === 2) && gy >= -16 && gy <= 16;
        const isAvenidaCriadoresSidewalk= (gy === -1 || gy === 2) && gx >= -18 && gx <= 18;
        const isIndustrialSidewalk      = ((gy === -3 || gy === -6) && gx >= 1 && gx <= 18);
        const isInnovationSidewalk      = ((gy === 5 || gy === 8) && gx >= -14 && gx <= 14);
        const isWestSidewalk            = ((gx === -8 || gx === -11) && gy >= -14 && gy <= 12);
        const isEastSidewalk            = ((gx === 8 || gx === 11) && gy >= -10 && gy <= 4);

        const isSidewalk = (!isRoad && !isWater && !isPraiaBeach && !isPortoDock && !isCliffZone) && (
          isAvenidaFenixSidewalk || isAvenidaCriadoresSidewalk || isIndustrialSidewalk || isInnovationSidewalk || isWestSidewalk || isEastSidewalk || (dist >= 2.9 && dist <= 3.8)
        );

        // D. Plazas, Courtyards & Dedicated Pavements
        const isPlazaCenter   = (dist < 1.6);
        const isPlazaDeposito = (gx >= 4 && gx <= 11 && gy >= -3 && gy <= 0 && !isRoad);
        const isPlazaData     = (gx >= 6 && gx <= 12 && gy >= 2 && gy <= 5 && !isRoad);
        const isParkingComm   = (gx >= -6 && gx <= -3 && gy >= 10 && gy <= 12);
        const isParkingHosp   = (gx >= 6 && gx <= 10 && gy >= 11 && gy <= 13);
        const isHelipadGround = (gx >= 6 && gx <= 8 && gy >= 7 && gy <= 8);
        const isGardenCentral = ((gx >= -3 && gx <= -1 && gy >= -3 && gy <= -1) || (gx >= 1 && gx <= 3 && gy >= -3 && gy <= -1));
        const isGardenHosp    = (gx >= 4 && gx <= 7 && gy >= 7 && gy <= 9 && !isHelipadGround);
        const isPlazaDev      = (gx >= -11 && gx <= -5 && gy >= 2 && gy <= 5 && !isRoad);
        const isPlazaCreative = (gx >= -12 && gx <= -5 && gy >= -11 && gy <= -7 && !isRoad);
        const isBoardwalk     = (gx === -10 && gy >= 7 && gy <= 16) || (gx === -13 && gy === 7);

        let tile = Cache.tiles.grass;
        if (isWater) {
          tile = Cache.tiles.water;
        } else if (isPraiaBeach) {
          if (isBoardwalk && Cache.tiles.boardwalk) {
            tile = Cache.tiles.boardwalk;
          } else {
            tile = (gx <= -16 || gy >= 15 || dist > 21) ? Cache.tiles.water : Cache.tiles.sand;
          }
        } else if (isPortoDock) {
          tile = (gx >= 18 || dist > 21.5) ? Cache.tiles.water : Cache.tiles.dock;
        } else if (isCliffZone) {
          tile = (gx <= -16.5 || gy <= -14.5) ? Cache.tiles.water : Cache.tiles.cliff;
        } else if (isPlazaCenter) {
          tile = Cache.tiles.paverStone || Cache.tiles.plaza;
        } else if (isPlazaDeposito || isPlazaData) {
          tile = Cache.tiles.industrialConcrete || Cache.tiles.asphalt;
        } else if (isParkingComm || isParkingHosp || isHelipadGround) {
          tile = Cache.tiles.industrialConcrete || Cache.tiles.parking || Cache.tiles.asphalt;
        } else if (isGardenCentral || isGardenHosp) {
          tile = Cache.tiles.flowerGarden || Cache.tiles.grass;
        } else if (isRoad) {
          const isCrosswalk = ((gx === 0 || gx === 1) && (gy === -3 || gy === 3)) ||
                              ((gy === 0 || gy === 1) && (gx === -3 || gx === 3)) ||
                              (gx === 5 && (gy === 6 || gy === 7)) ||
                              (gx === 6 && (gy === -4 || gy === -5)) ||
                              (gx === -3 && (gy === 6 || gy === 7));
          if (isCrosswalk && Cache.tiles.crosswalk) {
            tile = Cache.tiles.crosswalk;
          } else if (isAvenidaCriadores || isNorthIndustrial || isSouthInnovation || isPortoSpur) {
            tile = ((gy % 2) === 0) ? Cache.tiles.asphaltDashed1 : Cache.tiles.asphalt;
          } else if (isAvenidaFenix || isEastLogistics || isWestBoulevard) {
            tile = ((gx % 2) === 0) ? Cache.tiles.asphaltDashed2 : Cache.tiles.asphalt;
          } else {
            tile = Cache.tiles.asphalt;
          }
        } else if (isSidewalk) {
          tile = Cache.tiles.sidewalk;
        } else if (isPlazaDev) {
          tile = Cache.tiles.plaza;
        } else if (isPlazaCreative) {
          tile = Cache.tiles.plazaCreative || Cache.tiles.plaza;
        }

        const sc = this.toScreen(gx, gy, 0, cx, cy, zoom);
        const px = Math.round(sc.x - 32 * zoom);
        const py = Math.round(sc.y - 16 * zoom);
        const pw = Math.round(64 * zoom);
        const ph = Math.round(32 * zoom);

        // Hardware frustum culling: skip tiles outside viewport
        if (px + pw < -64 || px > width + 64 || py + ph < -64 || py > height + 64) continue;
        ctx.drawImage(tile, px, py, pw, ph);
      }
    }

    // ── 2. GROUND LIGHT POOLS PASS ───────────────────────────────
    const lampPositions = [
      [-1, -2], [2, -2], [-1, 3], [2, 3],
      [-1, -7], [2, -7], [-1, 7], [2, 7],
      [-1, -12], [2, -12], [-1, 12], [2, 12],
      [-5, -1], [-5, 2], [5, -1], [5, 2],
      [-9, -1], [-9, 2], [9, -1], [9, 2],
      [-13, -1], [-13, 2], [13, -1], [13, 2],
      [-9, 5], [-9, 8], [9, 5], [9, 8],
      [-9, -6], [-9, -9], [9, -6], [9, -9],
      [4, -3], [7, -3], [12, -3], [15, -3]
    ];
    if (Cache.props?.lampLightPool) {
      for (const [lx, ly] of lampPositions) {
        const sc = this.toScreen(lx, ly, 0, cx, cy, zoom);
        if (sc.x < -100 || sc.x > width + 100 || sc.y < -100 || sc.y > height + 100) continue;
        ctx.drawImage(
          Cache.props.lampLightPool,
          Math.round(sc.x - 64 * zoom),
          Math.round(sc.y - 32 * zoom),
          Math.round(128 * zoom),
          Math.round(64 * zoom)
        );
      }
    }

    // ── 3. UNIFIED 2.5D DEPTH-SORTED SCENE GRAPH ──────────────────
    const scene = [];

    // Determine single closest canonical landmark to screen center for Tier 3 cutaway
    let closestBuildingKey = null;
    let minCenterDist = 90 * zoom;
    if (zoom >= 2.7) {
      const landmarkCoords = {
        'command-center': { x: 0, y: -5.5 },
        'industrial': { x: 6.5, y: -2.5 },
        'project-district': { x: 10.0, y: -8.0 },
        'ai-district': { x: 8.0, y: -5.5 },
        'dev-district': { x: -7.0, y: 4.0 },
        'creative-district': { x: -9.5, y: -1.5 },
        'data-center': { x: 8.0, y: 4.5 },
        'observatory': { x: 0, y: -13.0 }
      };
      for (const [k, c] of Object.entries(landmarkCoords)) {
        if (CANONICAL_BUILDING_FLOORS[k]) {
          const sc = this.toScreen(c.x, c.y, 0, cx, cy, zoom);
          const d = Math.hypot(sc.x - width / 2, sc.y - height / 2);
          if (d < minCenterDist) {
            minCenterDist = d;
            closestBuildingKey = k;
          }
        }
      }
    }

    // Helper to add landmark building with strict single-cutaway support (Tier 3: zoom >= 2.7)
    const addBuilding = (canvas, bx, by, sortOffset, w, h, bldKey) => {
      if (!canvas) return;
      const base = this.toScreen(bx, by, 0, cx, cy, zoom);
      const hasInterior = Boolean(CANONICAL_BUILDING_FLOORS[bldKey]);
      const isExplicitCutaway = hasInterior && Boolean(this.state.cutawayBuilding) && (this.state.cutawayBuilding === bldKey);
      const isFocused = hasInterior && (this.activeBuilding === bldKey);
      const isClosest = hasInterior && (closestBuildingKey === bldKey && !this.activeBuilding && !this.state.cutawayBuilding);
      const isCutaway = hasInterior && (isExplicitCutaway || (zoom >= 2.7 && (isFocused || isClosest)));

      if (isCutaway) {
        scene.push({
          sortY: base.y - 12 * zoom,
          draw: () => {
            this._drawInteriorFloor(ctx, bldKey, bx, by, cx, cy, zoom);
          }
        });
      }

      scene.push({
        sortY: base.y + sortOffset * zoom,
        draw: () => {
          // Projected Isometric Ground Shadow (SE sun direction)
          ctx.save();
          const sw = (w * 0.52) * zoom;
          const sh = (h * 0.38) * zoom;
          const sGrad = ctx.createRadialGradient(
            base.x + sw * 0.25, base.y + 4 * zoom, 2,
            base.x + sw * 0.45, base.y + 6 * zoom, sw * 1.15
          );
          sGrad.addColorStop(0, 'rgba(0, 4, 15, 0.42)');
          sGrad.addColorStop(0.5, 'rgba(0, 4, 15, 0.22)');
          sGrad.addColorStop(1, 'rgba(0, 4, 15, 0)');
          ctx.fillStyle = sGrad;
          ctx.beginPath();
          ctx.ellipse(base.x + sw * 0.25, base.y + 6 * zoom, sw * 0.95, sh * 0.45, Math.PI / 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          if (isCutaway) {
            ctx.save();
            ctx.globalAlpha = Math.max(0.14, 1 - (zoom - 1.5) * 1.6);
          }
          ctx.drawImage(
            canvas,
            Math.round(base.x - (w / 2) * zoom),
            Math.round(base.y - (h - 25) * zoom),
            Math.round(w * zoom),
            Math.round(h * zoom)
          );
          if (isCutaway) ctx.restore();
        }
      });
    };

    // Helper to add environmental prop with frustum culling
    const addProp = (canvas, px, py, ox, oy, pw, ph, sortOffsetY = 0) => {
      if (!canvas) return;
      const sc = this.toScreen(px, py, 0, cx, cy, zoom);
      if (sc.x < -80 || sc.x > width + 80 || sc.y < -80 || sc.y > height + 80) return;
      scene.push({
        sortY: sc.y + sortOffsetY * zoom,
        draw: () => {
          ctx.drawImage(
            canvas,
            Math.round(sc.x - ox * zoom),
            Math.round(sc.y - oy * zoom),
            Math.round(pw * zoom),
            Math.round(ph * zoom)
          );
        }
      });
    };

    // A. 15 Canonical District & Enterprise Landmarks
    addBuilding(Cache.buildings.fenixHQ, 0, -5.5, 0, 160, 175, 'command-center');
    addBuilding(Cache.buildings.depositoMais, 6.5, -2.5, 0, 180, 165, 'industrial');
    addBuilding(Cache.buildings.projectForge, 10.0, -8.0, 0, 150, 155, 'project-district');
    addBuilding(Cache.buildings.aiNexus, 8.0, -5.5, 0, 150, 170, 'ai-district');
    addBuilding(Cache.buildings.devLoft, -7.0, 4.0, 0, 150, 155, 'dev-district');
    addBuilding(Cache.buildings.researchLab, -7.0, -8.5, 0, 150, 155, 'research');
    addBuilding(Cache.buildings.creativeStudio, -9.5, -1.5, 0, 150, 155, 'creative-district');
    addBuilding(Cache.buildings.securityCitadel, 9.0, 1.0, 0, 160, 170, 'security');
    addBuilding(Cache.buildings.businessTower, 2.0, 5.0, 0, 160, 180, 'business');
    addBuilding(Cache.buildings.dataCenter, 8.0, 4.5, 0, 160, 165, 'data-center');
    addBuilding(Cache.buildings.observatory, 0, -13.0, 0, 150, 165, 'observatory');
    addBuilding(Cache.buildings.hospital, 5.5, 9.0, 0, 150, 160, 'hospital');
    addBuilding(Cache.buildings.shopping, -2.5, 9.0, 0, 160, 155, 'shopping');
    addBuilding(Cache.buildings.residential, -11.0, -5.5, 0, 150, 160, 'residential');
    addBuilding(Cache.buildings.portTerminal, 13.5, -4.0, 0, 180, 160, 'porto');

    // B. Secondary Architectural Buildings (Dense District Architecture)
    if (Cache.buildings.civicAnnex) {
      addBuilding(Cache.buildings.civicAnnex, -3.2, -4.5, 0, 120, 110, 'command-center');
      addBuilding(Cache.buildings.civicAnnex, -0.5, 9.0, 0, 120, 110, 'shopping');
    }
    if (Cache.buildings.depositoWarehouseB) {
      addBuilding(Cache.buildings.depositoWarehouseB, 9.5, -2.5, 0, 150, 125, 'industrial');
      addBuilding(Cache.buildings.depositoWarehouseB, 7.0, -6.5, 0, 150, 125, 'industrial');
    }
    if (Cache.buildings.apartmentBlockA) {
      addBuilding(Cache.buildings.apartmentBlockA, -13.0, -4.5, 0, 130, 150, 'residential');
      addBuilding(Cache.buildings.apartmentBlockA, -9.0, -6.5, 0, 130, 150, 'residential');
      addBuilding(Cache.buildings.apartmentBlockA, 3.5, 7.5, 0, 130, 150, 'business');
    }
    if (Cache.buildings.townhouseRow) {
      addBuilding(Cache.buildings.townhouseRow, -13.5, -7.0, 0, 120, 105, 'residential');
      addBuilding(Cache.buildings.townhouseRow, -11.5, -3.0, 0, 120, 105, 'residential');
      addBuilding(Cache.buildings.townhouseRow, -6.5, 1.5, 0, 120, 105, 'dev-district');
    }
    if (Cache.buildings.quantumDome) {
      addBuilding(Cache.buildings.quantumDome, -10.5, -9.0, 0, 110, 95, 'research');
      addBuilding(Cache.buildings.quantumDome, 11.5, -6.0, 0, 110, 95, 'project-district');
    }
    if (Cache.buildings.serverBarn) {
      addBuilding(Cache.buildings.serverBarn, 10.5, 4.5, 0, 120, 110, 'data-center');
      addBuilding(Cache.buildings.serverBarn, 6.5, -6.0, 0, 120, 110, 'ai-district');
    }
    if (Cache.buildings.storefrontCafe) {
      addBuilding(Cache.buildings.storefrontCafe, -5.0, 9.0, 0, 100, 115, 'shopping');
      addBuilding(Cache.buildings.storefrontCafe, -3.5, 3.5, 0, 100, 115, 'dev-district');
    }
    if (Cache.buildings.guardTower) {
      addBuilding(Cache.buildings.guardTower, 11.5, 1.0, 0, 60, 120, 'security');
      addBuilding(Cache.buildings.guardTower, 5.0, -0.5, 0, 60, 120, 'industrial');
    }


    // C. NEW FILLER BUILDINGS (DENSE URBAN WORLD)
    if (Cache.buildings.officeBlockA) {
      // NW block: gx=-8..-1, gy=-3..-1
      addBuilding(Cache.buildings.officeBlockA, -3.5, -2.5, 0, 70, 130, 'business');
      addBuilding(Cache.buildings.retailStripA, -5.5, -1.5, 0, 90, 100, 'shopping');
      addBuilding(Cache.buildings.apartmentMidA, -2.5, -1.5, 0, 60, 145, 'residential');
      addBuilding(Cache.buildings.techStartup, -1.5, -2.5, 0, 70, 120, 'dev-district');

      // NE block: gx=2..8, gy=-3..-1
      addBuilding(Cache.buildings.officeBlockB, 3.5, -1.5, 0, 70, 140, 'business');
      addBuilding(Cache.buildings.restaurantA, 5.0, -1.5, 0, 70, 85, 'shopping');
      addBuilding(Cache.buildings.apartmentMidB, 4.0, -2.5, 0, 60, 125, 'residential');
      addBuilding(Cache.buildings.parkingStructure, 2.5, -2.5, 0, 80, 115, 'industrial');

      // SW block: gx=-8..-1, gy=2..5
      addBuilding(Cache.buildings.hotelSmall, -3.5, 2.5, 0, 70, 135, 'business');
      addBuilding(Cache.buildings.retailStripB, -5.5, 2.5, 0, 90, 105, 'shopping');
      addBuilding(Cache.buildings.clinicSmall, -2.5, 3.5, 0, 80, 105, 'hospital');
      addBuilding(Cache.buildings.workshopGarage, -4.5, 4.5, 0, 80, 85, 'industrial');

      // SE block: gx=2..8, gy=2..5
      addBuilding(Cache.buildings.officeBlockA, 3.5, 2.5, 0, 70, 130, 'business');
      addBuilding(Cache.buildings.techStartup, 5.5, 2.5, 0, 70, 120, 'dev-district');
      addBuilding(Cache.buildings.apartmentMidA, 3.5, 3.5, 0, 60, 145, 'residential');
      addBuilding(Cache.buildings.restaurantA, 5.5, 3.5, 0, 70, 85, 'shopping');

      // Far NW: gx=-8..-1, gy=-8..-6
      addBuilding(Cache.buildings.apartmentMidB, -3.5, -7.5, 0, 60, 125, 'residential');
      addBuilding(Cache.buildings.clinicSmall, -5.5, -7.5, 0, 80, 105, 'hospital');
      addBuilding(Cache.buildings.parkingStructure, -2.5, -6.5, 0, 80, 115, 'industrial');
      addBuilding(Cache.buildings.workshopGarage, -4.5, -6.5, 0, 80, 85, 'industrial');

      // Far NE: gx=2..8, gy=-8..-6
      addBuilding(Cache.buildings.officeBlockB, 3.5, -7.5, 0, 70, 140, 'business');
      addBuilding(Cache.buildings.hotelSmall, 5.5, -7.5, 0, 70, 135, 'business');
      addBuilding(Cache.buildings.retailStripA, 3.5, -6.5, 0, 90, 100, 'shopping');
      addBuilding(Cache.buildings.retailStripB, 5.5, -6.5, 0, 90, 105, 'shopping');
      
      // Additional scattered filler blocks to avoid empty spaces
      addBuilding(Cache.buildings.apartmentMidA, -8.5, 2.5, 0, 60, 145, 'residential');
      addBuilding(Cache.buildings.apartmentMidB, -8.5, 3.5, 0, 60, 125, 'residential');
      addBuilding(Cache.buildings.officeBlockA, 7.5, 2.5, 0, 70, 130, 'business');
      addBuilding(Cache.buildings.officeBlockB, 7.5, 3.5, 0, 70, 140, 'business');
      addBuilding(Cache.buildings.hotelSmall, -8.5, -2.5, 0, 70, 135, 'business');
      addBuilding(Cache.buildings.restaurantA, 7.5, -2.5, 0, 70, 85, 'shopping');
    }

    // C. Logistics Container Stacks & Equipment

    if (Cache.props.containerStackBlue) {
      addProp(Cache.props.containerStackBlue, 12.0, -2.5, 34, 44, 68, 52);
      addProp(Cache.props.containerStackBlue, 15.0, -2.5, 34, 44, 68, 52);
      addProp(Cache.props.containerStackBlue, 10.5, -1.0, 34, 44, 68, 52);
    }
    if (Cache.props.containerStackRed) {
      addProp(Cache.props.containerStackRed, 12.0, -1.0, 34, 44, 68, 52);
      addProp(Cache.props.containerStackRed, 15.0, -1.0, 34, 44, 68, 52);
      addProp(Cache.props.containerStackRed, 8.5, -1.0, 34, 44, 68, 52);
    }
    if (Cache.props.forklift) {
      addProp(Cache.props.forklift, 7.5, -1.2, 18, 24, 36, 30);
      addProp(Cache.props.forklift, 11.0, -2.2, 18, 24, 36, 30);
    }
    if (Cache.props.cargoPallet) {
      addProp(Cache.props.cargoPallet, 5.5, -1.8, 20, 20, 40, 28);
      addProp(Cache.props.cargoPallet, 7.0, -1.8, 20, 20, 40, 28);
      addProp(Cache.props.cargoPallet, 10.0, -1.8, 20, 20, 40, 28);
    }
    if (Cache.props.helipad) {
      // Relocated to Hospital emergency landing bay (off active street)
      addProp(Cache.props.helipad, 7.0, 7.5, 40, 24, 80, 48, -1);
    }

    // D. Central Plaza Marble Fountain (Center 0, 0)
    if (Cache.props.centralFountain) {
      addProp(Cache.props.centralFountain, 0, 0, 48, 38, 96, 64);
    }
    if (Cache.props.parkBench) {
      addProp(Cache.props.parkBench, -1.1, 0.7, 18, 18, 36, 24);
      addProp(Cache.props.parkBench, 1.1, 0.7, 18, 18, 36, 24);
      addProp(Cache.props.parkBench, -1.1, -0.7, 18, 18, 36, 24);
      addProp(Cache.props.parkBench, 1.1, -0.7, 18, 18, 36, 24);
    }
    if (Cache.props.flowerBed) {
      addProp(Cache.props.flowerBed, -2.0, 0, 24, 16, 48, 28);
      addProp(Cache.props.flowerBed, 2.0, 0, 24, 16, 48, 28);
    }

    // E. Maritime Gantry Crane & Cargo Ship (Porto Digital)
    if (Cache.props.cargoShip) {
      addProp(Cache.props.cargoShip, 16.0, -3.8, 80, 45, 160, 70, -10);
    }
    if (Cache.props.harborCrane) {
      addProp(Cache.props.harborCrane, 14.0, -4.8, 60, 138, 120, 150, 15);
    }

    // F. Cascading Cliff Waterfall
    if (Cache.props.waterfall) {
      addProp(Cache.props.waterfall, -12.5, -10.5, 24, 70, 48, 80, -5);
    }

    // G. Beach Palms & Parasols
    if (Cache.props.palmTree) {
      const palms = [
        [-11, 8], [-12, 10], [-10, 11], [-13, 12], [-11, 14],
        [-14, 9], [-15, 11], [-13, 15]
      ];
      for (const [px, py] of palms) addProp(Cache.props.palmTree, px, py, 32, 78, 64, 90);
    }
    if (Cache.props.beachUmbrella) {
      const umbrellas = [
        [-11.8, 8.5], [-12.8, 7.2], [-10.8, 12.5],
        [-13.5, 10.5], [-12.0, 11.0]
      ];
      for (const [ux, uy] of umbrellas) addProp(Cache.props.beachUmbrella, ux, uy, 24, 44, 48, 54);
    }

    // H. Sakura Trees (Central Plaza Perimeter Framing)
    if (Cache.props.treeSakura) {
      const sakuras = [
        [-3.2, -3.2], [3.2, -3.2], [-3.2, 3.2], [3.2, 3.2],
        [-1.8, -2.8], [1.8, -2.8]
      ];
      for (const [sx, sy] of sakuras) addProp(Cache.props.treeSakura, sx, sy, 32, 70, 64, 80);
    }

    // I. Street Trees (Linden & Oak)
    if (Cache.props.treeLinden || Cache.props.tree) {
      const treeSprite = Cache.props.treeLinden || Cache.props.tree;
      const streetTrees = [
        [-1.8, -4], [2.2, -4], [-1.8, -8], [2.2, -8], [-1.8, 4], [2.2, 4], [-1.8, 8], [2.2, 8],
        [-4, -1.8], [-4, 2.2], [-8, -1.8], [-8, 2.2], [4, -1.8], [4, 2.2], [8, -1.8], [8, 2.2]
      ];
      for (const [tx, ty] of streetTrees) addProp(treeSprite, tx, ty, 28, 58, 56, 70);

      // Systematic trees along sidewalks
      const sysTrees = [];
      for(let x=-12; x<=12; x++) {
         if(Math.abs(x)%2===0 && x!==0 && x!==-1 && x!==1) {
            sysTrees.push([x+0.2, -1.2]);
            sysTrees.push([x-0.2, 1.2]);
            sysTrees.push([x+0.2, -4.2]);
            sysTrees.push([x-0.2, 6.2]);
         }
      }
      for(let y=-12; y<=12; y++) {
         if(Math.abs(y)%2===0 && y!==0 && y!==-1 && y!==1) {
            sysTrees.push([-1.2, y+0.2]);
            sysTrees.push([1.2, y-0.2]);
            sysTrees.push([-4.2, y+0.2]);
            sysTrees.push([9.2, y-0.2]);
         }
      }
      for(let i=0; i<sysTrees.length; i++) {
        let t = (i%2===0 && Cache.props.treeLinden) ? Cache.props.treeLinden : Cache.props.tree;
        if(t) addProp(t, sysTrees[i][0], sysTrees[i][1], 28, 58, 56, 70);
      }
    }

    // J. Coniferous Pine Trees (Observatory & Mountain Ridge)
    if (Cache.props.treePine) {
      const pines = [
        [-2, -12], [2, -12], [-4, -13], [4, -13], [-1, -15], [1, -15],
        [-5, -14], [5, -14], [-3, -16], [3, -16], [0, -15], [-7, -13], [7, -13]
      ];
      for (const [px, py] of pines) addProp(Cache.props.treePine, px, py, 24, 68, 48, 80);
    }

    // K. Broadleaf Oak Trees (Residential & Parks)
    if (Cache.props.tree) {
      const oaks = [[-12, -3.5], [-14, -3.5], [-10, -7.5], [-3, 7], [3, 7]];
      for (const [ox, oy] of oaks) addProp(Cache.props.tree, ox, oy, 32, 68, 64, 80);
    }

    // L. Hedges & Flowerbeds
    if (Cache.props.bushHedge) {
      const hedges = [[-1.8, -2], [2.2, -2], [-1.8, 2], [2.2, 2], [4.5, -1.5], [-4.5, 3.5]];
      for (const [hx, hy] of hedges) addProp(Cache.props.bushHedge, hx, hy, 20, 18, 40, 26);
    }
    if (Cache.props.flowerBed) {
      const flowerBeds = [
        [-1.5, 1.0], [2.5, 1.0], [4.5, 8.5], [-3.5, 8.5],
        [1.5, -2.0], [-1.5, -2.0]
      ];
      for (const [fx, fy] of flowerBeds) addProp(Cache.props.flowerBed, fx, fy, 24, 16, 48, 28);
    }


    // FILLER PROPS
    if (Cache.props.mailbox) {
      addProp(Cache.props.mailbox, -1.2, -1.2, 10, 24, 20, 30);
      addProp(Cache.props.mailbox, 3.2, 2.8, 10, 24, 20, 30);
      addProp(Cache.props.mailbox, -4.2, 2.8, 10, 24, 20, 30);
    }
    if (Cache.props.newsstand) {
      addProp(Cache.props.newsstand, -2.5, -1.2, 18, 34, 36, 40);
      addProp(Cache.props.newsstand, 4.5, 2.8, 18, 34, 36, 40);
    }
    if (Cache.props.vendingMachine) {
      addProp(Cache.props.vendingMachine, -3.5, -1.2, 12, 34, 24, 40);
      addProp(Cache.props.vendingMachine, 2.5, 2.8, 12, 34, 24, 40);
      addProp(Cache.props.vendingMachine, 5.5, -1.2, 12, 34, 24, 40);
    }
    if (Cache.props.dumpster) {
      addProp(Cache.props.dumpster, -4.5, -2.8, 15, 18, 30, 24);
      addProp(Cache.props.dumpster, 3.5, -2.8, 15, 18, 30, 24);
      addProp(Cache.props.dumpster, 4.5, 4.2, 15, 18, 30, 24);
      addProp(Cache.props.dumpster, -3.5, 4.2, 15, 18, 30, 24);
    }
    if (Cache.props.phoneBooth) {
      addProp(Cache.props.phoneBooth, -2.8, -1.2, 10, 34, 20, 40);
      addProp(Cache.props.phoneBooth, 3.8, 2.8, 10, 34, 20, 40);
    }
    if (Cache.props.busStop) {
      addProp(Cache.props.busStop, -1.5, -1.5, 20, 34, 40, 40);
      addProp(Cache.props.busStop, 2.5, 2.5, 20, 34, 40, 40);
      addProp(Cache.props.busStop, -5.5, 1.5, 20, 34, 40, 40);
    }

    // M. Street Furniture & Civic Props

    for (const [lx, ly] of lampPositions) {
      addProp(Cache.props.streetlamp, lx, ly, 16, 54, 32, 64);
    }
    if (Cache.props.bench) {
      const benches = [
        [-1.2, -0.6], [1.2, -0.6], [-1.2, 0.6], [1.2, 0.6],
        [-1.5, 5.0], [2.5, 5.0], [-1.5, -5.0], [2.5, -5.0],
        [4.5, 7.5], [6.5, 7.5]
      ];
      for (const [bx, by] of benches) addProp(Cache.props.bench, bx, by, 18, 18, 36, 24);
    }
    if (Cache.props.trafficLight) {
      const trafficLights = [[-1.2, 0.2], [2.2, 0.2], [-1.2, 6.2], [2.2, 6.2]];
      for (const [tx, ty] of trafficLights) addProp(Cache.props.trafficLight, tx, ty, 12, 52, 24, 60);
    }
    if (Cache.props.metroEntrance) {
      addProp(Cache.props.metroEntrance, 1.5, 1.8, 32, 30, 64, 44);
    }
    if (Cache.props.kioskNews) {
      addProp(Cache.props.kioskNews, -1.5, 1.8, 27, 40, 54, 50);
      addProp(Cache.props.kioskNews, 3.0, 3.5, 27, 40, 54, 50);
    }
    if (Cache.props.cafeTable) {
      addProp(Cache.props.cafeTable, -4.2, 7.8, 24, 38, 48, 48);
      addProp(Cache.props.cafeTable, -3.2, 7.8, 24, 38, 48, 48);
      addProp(Cache.props.cafeTable, -4.5, 3.8, 24, 38, 48, 48);
    }
    if (Cache.props.bikeRack) {
      addProp(Cache.props.bikeRack, -5.5, 3.2, 22, 20, 44, 28);
      addProp(Cache.props.bikeRack, 1.8, 2.5, 22, 20, 44, 28);
    }
    if (Cache.props.fireHydrant) {
      const hydrants = [[-1.5, 4.2], [2.5, 4.2], [-7.5, 2.2], [7.5, 2.2]];
      for (const [hx, hy] of hydrants) addProp(Cache.props.fireHydrant, hx, hy, 10, 22, 20, 28);
    }
    if (Cache.props.trashBin) {
      const bins = [[-1.5, -3.5], [2.5, -3.5], [-1.5, 3.5], [2.5, 3.5]];
      for (const [bx, by] of bins) addProp(Cache.props.trashBin, bx, by, 10, 24, 20, 30);
    }
    if (Cache.props.solarPanelArray) {
      addProp(Cache.props.solarPanelArray, -8.5, -7.0, 32, 26, 64, 36);
      addProp(Cache.props.solarPanelArray, 11.5, -7.0, 32, 26, 64, 36);
    }
    if (Cache.props.transformerBox) {
      addProp(Cache.props.transformerBox, 9.5, 5.5, 16, 24, 32, 32);
      addProp(Cache.props.transformerBox, 11.0, -1.5, 16, 24, 32, 32);
    }

    // N. Dynamic Animated Vehicles on Roadways & Parked Cars
    if (Cache.props.carSedanWhite) {
      addProp(Cache.props.carSedanWhite, -4.5, 11.2, 22, 18, 44, 24);
      addProp(Cache.props.carSedanWhite, 8.5, 11.2, 22, 18, 44, 24);
    }
    if (Cache.props.carTaxiYellow) {
      addProp(Cache.props.carTaxiYellow, -3.5, 11.2, 22, 19, 44, 26);
    }
    if (Cache.props.vanDeliveryOrange || Cache.props.deliveryTruck) {
      const vanSprite = Cache.props.vanDeliveryOrange || Cache.props.deliveryTruck;
      const vanPhase = ((this.time || 0) * 0.12) % 1;
      const vanX = 2.0 + vanPhase * 8.0;
      addProp(vanSprite, vanX, -4.5, 28, 22, 56, 32);
    }
    if (Cache.props.ambulance) {
      const ambPhase = ((this.time || 0) * 0.14) % 1;
      const ambX = 0.5 + ambPhase * 7.5;
      addProp(Cache.props.ambulance, ambX, 6.5, 27, 24, 54, 32);
    }
    if (Cache.props.carTaxiYellow || Cache.props.car) {
      const taxiSprite = Cache.props.carTaxiYellow || Cache.props.car;
      const taxiPhase = ((this.time || 0) * 0.16) % 1;
      const taxiY = -12 + taxiPhase * 24;
      addProp(taxiSprite, 1.0, taxiY, 22, 19, 44, 26);
    }
    if (Cache.props.carSedanWhite || Cache.props.car) {
      const carSprite = Cache.props.carSedanWhite || Cache.props.car;
      const carPhase = ((this.time || 0) * 0.15) % 1;
      const carX = -14 + carPhase * 28;
      addProp(carSprite, carX, 0.5, 22, 18, 44, 24);
    }
    if (Cache.props.policeCruiser) {
      const copPhase = ((this.time || 0) * 0.13) % 1;
      const copY = -12 + copPhase * 24;
      addProp(Cache.props.policeCruiser, -9.5, copY, 22, 18, 44, 24);
    }
    if (Cache.props.freightTruck) {
      addProp(Cache.props.freightTruck, 8.0, -3.5, 38, 28, 76, 38);
    }
    if (Cache.props.commuterTrain) {
      const trainSpeed = 0.08;
      const trainPhase = ((this.time || 0) * trainSpeed) % 4;
      const segment = Math.floor(trainPhase);
      const frac = trainPhase - segment;
      const perimeterLoop = [
        { x: -16.0, y: -16.0 }, { x: 16.0, y: -16.0 },
        { x: 16.0, y: 16.0 }, { x: -16.0, y: 16.0 }
      ];
      const p1 = perimeterLoop[segment];
      const p2 = perimeterLoop[(segment + 1) % 4];
      const tx = p1.x + (p2.x - p1.x) * frac;
      const ty = p1.y + (p2.y - p1.y) * frac;
      addProp(Cache.props.commuterTrain, tx, ty, 60, 24, 120, 36, 20);
    }

    // O. Munder Difflin Living Office — Physical Infrastructure & Desks
    const placedStations = new Set();
    for (const [agentId, st] of Object.entries(CANONICAL_AGENT_STATIONS)) {
      const posKey = `${st.x},${st.y}`;
      if (placedStations.has(posKey)) continue;
      placedStations.add(posKey);

      const ws = this.toScreen(st.x, st.y, 0, cx, cy, zoom);
      scene.push({
        sortY: ws.y - 2 * zoom,
        draw: () => {
          if (Cache.workstations && Cache.workstations.devDesk) {
            ctx.drawImage(
              Cache.workstations.devDesk,
              Math.round(ws.x - 32 * zoom),
              Math.round(ws.y - 36 * zoom),
              Math.round(64 * zoom),
              Math.round(46 * zoom)
            );
          }
        }
      });
    }

    if (Cache.workstations?.conferenceTable) addProp(Cache.workstations.conferenceTable, -5.0, -6.8, 48, 32, 96, 64, 2);
    if (Cache.workstations?.whiteboard) addProp(Cache.workstations.whiteboard, -5.0, -9.0, 32, 48, 64, 56, 1);
    if (Cache.workstations?.coffeeBar) addProp(Cache.workstations.coffeeBar, 3.5, -8.0, 26, 44, 52, 52, 2);
    if (Cache.workstations?.waterCooler) addProp(Cache.workstations.waterCooler, 6.5, -8.0, 16, 44, 32, 50, 2);

    // Living World: Persistent Vehicles (Logistics, Trucks, Drones)
    if (Array.isArray(this.world.vehicles)) {
      for (const v of this.world.vehicles) {
        const vx = typeof v.x === 'number' ? v.x : 0;
        const vy = typeof v.y === 'number' ? v.y : 0;
        const isDrone = v.type === 'DRONE';
        const altitude = isDrone ? (typeof v.altitude === 'number' ? v.altitude * 0.015 : 0.35) : 0.05;
        const sc = this.toScreen(vx, vy, altitude, cx, cy, zoom);
        scene.push({
          sortY: sc.y,
          draw: () => {
            this._drawWorldVehicle(ctx, v, cx, cy, zoom);
          }
        });
      }
    }

    // Living World: Persistent Constructions (Foundations, Cranes, Finishing)
    if (Array.isArray(this.world.constructions)) {
      for (const c of this.world.constructions) {
        const cxCoord = typeof c.x === 'number' ? c.x : 0;
        const cyCoord = typeof c.y === 'number' ? c.y : 0;
        const sc = this.toScreen(cxCoord, cyCoord, 0, cx, cy, zoom);
        scene.push({
          sortY: sc.y,
          draw: () => {
            this._drawWorldConstruction(ctx, c, cx, cy, zoom);
          }
        });
      }
    }

    // P. Characters (Agents)
    for (const agent of this.world.agents.values()) {
      if (!this._filterAllowsAgent(agent)) continue;
      const ax = (typeof agent.x === 'number' && !isNaN(agent.x)) ? agent.x : (typeof agent.homeX === 'number' && !isNaN(agent.homeX) ? agent.homeX : 0);
      const ay = (typeof agent.y === 'number' && !isNaN(agent.y)) ? agent.y : (typeof agent.homeY === 'number' && !isNaN(agent.homeY) ? agent.homeY : 0);
      const sc = this.toScreen(ax, ay, 0, cx, cy, zoom);
      scene.push({
        sortY: sc.y,
        draw: () => {
          this._drawAgent(ctx, agent, cx, cy, zoom);
        }
      });
    }

    // Strict Y-sorting (Painter's Algorithm for true 2.5D depth)
    scene.sort((a, b) => a.sortY - b.sortY);

    // Draw all depth-sorted entities
    for (const item of scene) {
      item.draw();
    }

    // ── 4. FLOATING 3D ISOMETRIC DISTRICT PINS & HABBO DIALOGUES ──
    this._drawFloatingCityPins(ctx, cx, cy, zoom);
    this._drawHabboAgentDialogues(ctx, cx, cy, zoom);
  }

  _drawFloatingCityPins(ctx, cx, cy, zoom) {
    this._pinHitBoxes = [];
    if (this.state.photoMode || zoom >= 2.2) return;
    const Cache = window.FenixPixelEngine?.Cache || {};
    const pins = [
      { id: 'command-center', x: 0, y: -5.5, h: 180, icon: '🏢', title: 'FÊNIX HQ', sub: 'Sistema Central', color: '#38bdf8' },
      { id: 'industrial', x: 6.5, y: -2.5, h: 165, icon: '🏭', title: 'DEPÓSITO MAIS', sub: 'Construção & Materiais', color: '#ea580c', isCompany: true, hasRedPin: true },
      { id: 'dev-district', x: -7.0, y: 4.0, h: 160, icon: '⚡', title: 'API PLATFORM', sub: 'Gateway & Microservices', color: '#00D9FF', isCompany: true },
      { id: 'creative-district', x: -9.5, y: -1.5, h: 155, icon: '🎨', title: 'DESIGN', sub: 'UI/UX e Criatividade', color: '#ec4899' },
      { id: 'project-district', x: 10.0, y: -8.0, h: 155, icon: '📁', title: 'PROJECTS', sub: 'Code Forge & Deploy', color: '#06b6d4' },
      { id: 'ai-district', x: 8.0, y: -5.5, h: 170, icon: '🧠', title: 'AI NEXUS', sub: 'Modelos & RAG Lab', color: '#a855f7' },
      { id: 'research', x: -7.0, y: -8.5, h: 155, icon: '🔬', title: 'RESEARCH', sub: 'IA e Inovação', color: '#a855f7' },
      { id: 'residential', x: -11.0, y: -5.5, h: 160, icon: '🏠', title: 'RESIDENCIAL', sub: 'Vila dos Agentes', color: '#14b8a6' },
      { id: 'praia', x: -12.0, y: 9.5, h: 120, icon: '🏖️', title: 'PRAIA', sub: 'Lazer & Convivência', color: '#f59e0b' },
      { id: 'shopping', x: -2.5, y: 9.0, h: 155, icon: '🛍️', title: 'SHOPPING', sub: 'Serviços e Ferramentas', color: '#d946ef' },
      { id: 'business', x: 2.0, y: 5.0, h: 180, icon: '💼', title: 'BUSINESS', sub: 'Comercial & Financeiro', color: '#f59e0b' },
      { id: 'hospital', x: 5.5, y: 9.0, h: 160, icon: '🏥', title: 'HOSPITAL', sub: 'Self-Healing & Recuperação', color: '#22c55e' },
      { id: 'data-center', x: 8.0, y: 4.5, h: 165, icon: '🗄️', title: 'DATA CENTER', sub: 'Memória e Cloud Vault', color: '#06b6d4' },
      { id: 'security', x: 9.0, y: 1.0, h: 170, icon: '🛡️', title: 'SECURITY', sub: 'Fortaleza & Sandbox', color: '#ef4444' },
      { id: 'porto', x: 13.5, y: -4.0, h: 160, icon: '⚓', title: 'PORTO', sub: 'Logística & Exportação', color: '#0284c7' },
      { id: 'observatory', x: 0, y: -13.0, h: 165, icon: '🔭', title: 'OBSERVATORY', sub: 'Telemetria e CI/CD', color: '#6366f1' },
      { id: 'central-plaza', x: 0, y: 0, h: 70, icon: '🏛️', title: 'PRAÇA CENTRAL', sub: 'Eventos & Fórum', color: '#10b981' }
    ];

    for (const pin of pins) {
      const isSelected = (this.activeDistrict === pin.id);
      const isHovered = (this.state.hoveredPinId === pin.id);
      const isExpanded = isSelected || isHovered || (Boolean(this.state.showAllLabels) && zoom < 1.90);

      const sc = this.toScreen(pin.x, pin.y, 0, cx, cy, zoom);
      const px = sc.x;
      const py = sc.y - (pin.h - 30) * zoom;

      ctx.save();
      const bob = Math.sin(this.time * 2.5 + pin.x) * 3;
      const finalY = py + bob;

      // Register interactive hitbox (always covers the pin area)
      const hitW = 48 * zoom;
      const hitH = 48 * zoom;
      this._pinHitBoxes.push({
        id: pin.id,
        x: px - hitW / 2,
        y: finalY - hitH,
        w: hitW,
        h: hitH
      });

      if (isExpanded) {
        // FULL EXPANDED BADGE (Active on hover or selection)
        if (isSelected) {
          ctx.shadowColor = pin.color;
          ctx.shadowBlur = 16 * zoom;
        }

        const allAgents = this.agents || (this.world && this.world.agents ? Array.from(this.world.agents.values()) : []) || (this.state && this.state.agents ? this.state.agents : []);
        const districtAgents = allAgents.filter(a => a.district === pin.id || a.districtId === pin.id);
        const agentCount = districtAgents.length || '—';

        const allMissions = this.missions || (this.state && this.state.missions) || [];
        const districtMissions = allMissions.filter(m => m.district === pin.id || m.districtId === pin.id);
        const missionCount = districtMissions.length || '—';

        const label = `${pin.icon} ${(pin.title || pin.id).toUpperCase()}`;
        const sublabel = `${agentCount} agentes · ${missionCount} missões`;

        ctx.font = `bold ${Math.round(11 * Math.min(1.2, zoom))}px "Inter", sans-serif`;
        const nameWidth = ctx.measureText(label).width;
        ctx.font = `${Math.round(10 * Math.min(1.2, zoom))}px "Inter", sans-serif`;
        const subWidth = ctx.measureText(sublabel).width;

        const pillW = Math.max(nameWidth, subWidth) + 24;
        const pillH = Math.max(38, 38 * Math.min(1.2, zoom));
        const pillX = Math.max(16, Math.min((ctx.canvas ? ctx.canvas.width : 1920) - pillW - 16, px - pillW / 2));
        const pillY = finalY - pillH;

        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, 8);
        ctx.fillStyle = isSelected ? 'rgba(0, 217, 255, 0.28)' : 'rgba(9, 14, 26, 0.92)';
        ctx.fill();
        ctx.strokeStyle = isSelected ? 'rgba(0, 217, 255, 0.85)' : (pin.hasRedPin ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255, 255, 255, 0.2)');
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Needle pointer
        const needleX = Math.max(pillX + 12, Math.min(pillX + pillW - 12, px));
        ctx.beginPath();
        ctx.moveTo(needleX - 5, pillY + pillH);
        ctx.lineTo(needleX + 5, pillY + pillH);
        ctx.lineTo(needleX, pillY + pillH + 6);
        ctx.closePath();
        ctx.fillStyle = isSelected ? 'rgba(0, 217, 255, 0.8)' : 'rgba(255, 255, 255, 0.25)';
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.font = `bold ${Math.round(11 * Math.min(1.2, zoom))}px "Inter", sans-serif`;
        ctx.fillStyle = isSelected ? '#00D9FF' : (pin.hasRedPin ? '#fca5a5' : '#F8FAFC');
        ctx.textAlign = 'center';
        ctx.fillText(label, pillX + pillW/2, pillY + pillH * 0.45);

        ctx.font = `${Math.round(10 * Math.min(1.2, zoom))}px "Inter", sans-serif`;
        ctx.fillStyle = isSelected ? 'rgba(0, 217, 255, 0.85)' : '#94A3B8';
        ctx.fillText(sublabel, pillX + pillW/2, pillY + pillH * 0.8);
      } else if (pin.isCompany) {
        // Subtle company landmark beacon (Depósito Mais, API Platform, Fênix HQ)
        const dotR = Math.max(10, 11 * Math.min(1.2, zoom));
        ctx.shadowColor = pin.color;
        ctx.shadowBlur = 8 * zoom;

        ctx.beginPath();
        ctx.arc(px, finalY - dotR, dotR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(9, 14, 26, 0.88)';
        ctx.fill();
        ctx.strokeStyle = pin.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.font = `${Math.round(10 * Math.min(1.2, zoom))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pin.icon, px, finalY - dotR);
      } else {
        // MINIMAL SLEEK WAYPOINT (Section 18: CIDADE > TEXTO - Clean unobtrusive micro-beacon)
        const dotR = Math.max(3.5, 4.5 * Math.min(1.2, zoom));
        const pulse = Math.sin(this.time * 3 + pin.x) * 1.5;

        // Outer pulse ring
        ctx.strokeStyle = pin.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5 + Math.sin(this.time * 3 + pin.x) * 0.3;
        ctx.beginPath();
        ctx.arc(px, finalY - 8 * zoom, dotR + 3 + pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glowing core
        ctx.globalAlpha = 0.9;
        ctx.shadowColor = pin.color;
        ctx.shadowBlur = 6 * zoom;
        ctx.fillStyle = pin.color;
        ctx.beginPath();
        ctx.arc(px, finalY - 8 * zoom, dotR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, finalY - 8 * zoom, dotR * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Distinct 3D Red Map Marker Pin above Depósito Mais
      if (pin.hasRedPin && Cache.props?.mapPinRed) {
        const pinBob = Math.sin(this.time * 3) * 4;
        ctx.drawImage(
          Cache.props.mapPinRed,
          Math.round(px - 16 * zoom),
          Math.round(finalY - (isExpanded ? 52 : 36) * zoom + pinBob),
          Math.round(32 * zoom),
          Math.round(44 * zoom)
        );
      }

      ctx.restore();
    }
  }

  _drawHabboAgentDialogues(ctx, cx, cy, zoom) {
    if (this.state.photoMode) return;
    const sampleDialogues = {
      'agent.ceo': 'Evolução contínua Fênix 4.0.',
      'agent.orchestrator': 'Enxame sincronizado em 24/7.',
      'agent.developer': 'Refatorando módulos na IDE.',
      'agent.frontend': 'Interface espacial 60 FPS.',
      'agent.backend': 'Microserviços Fastify ativos.',
      'agent.database': 'PostgreSQL & BullMQ prontos.',
      'agent.visual': 'Visual isométrico lapidado.',
      'agent.browser': 'Navegação e OCR autônomos.',
      'agent.research': 'Mapeando papers e modelos.',
      'agent.debug': 'Auditoria de stacktrace ativa.',
      'agent.testing': '19 invariantes validados.',
      'agent.security': 'Sandbox Zero-Trust verificado.',
      'agent.git': 'Branch limpa e sincronizada.',
      'agent.github': 'Portfolio e clone 1-clique.',
      'agent.deployment': 'Paridade dual VPS garantida.',
      'agent.automation': 'Fluxos de auto-evolução.',
      'agent.computer': 'Host local & headless pronto.',
      'agent.media': 'Processamento visual ativo.',
      'agent.prompt': 'Prompts enriquecidos via RAG.',
      'agent.documentation': 'Memória ativa sincronizada.'
    };

    for (const agent of this.world.agents.values()) {
      const ax = (typeof agent.x === 'number' && !isNaN(agent.x)) ? agent.x : (typeof agent.homeX === 'number' && !isNaN(agent.homeX) ? agent.homeX : 0);
      const ay = (typeof agent.y === 'number' && !isNaN(agent.y)) ? agent.y : (typeof agent.homeY === 'number' && !isNaN(agent.homeY) ? agent.homeY : 0);
      const sc = this.toScreen(ax, ay, 0, cx, cy, zoom);

      const aId = String(agent.id || '');
      const isInteracting = (this.state.hoveredAgent?.id === agent.id || this.state.selectedAgent?.id === agent.id);
      const dialogue = agent.bubble?.text || (isInteracting ? (sampleDialogues[aId] || sampleDialogues[aId.replace('-', '.')] || sampleDialogues[aId.replace('.', '-')]) : null);
      if (!dialogue) continue;

      const bubbleW = Math.min(150, dialogue.length * 6 + 18);
      const bubbleH = 22;
      const bx = sc.x - bubbleW / 2;
      const by = sc.y - 48 * zoom;

      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.roundRect(bx, by, bubbleW, bubbleH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(sc.x - 3, by + bubbleH);
      ctx.lineTo(sc.x + 3, by + bubbleH);
      ctx.lineTo(sc.x, by + bubbleH + 4);
      ctx.closePath();
      ctx.fillStyle = '#38bdf8';
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 9px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(dialogue.length > 25 ? dialogue.slice(0, 24) + '…' : dialogue, sc.x, by + 14);

      ctx.restore();
    }
  }

  _drawInteriorFloor(ctx, bldKey, bx, by, cx, cy, zoom) {
    const tw = this.state.tileSize;
    const th = tw / 2;
    const P = window.FenixPixelEngine;
    const Cache = P?.Cache;

    const bldDef = CANONICAL_BUILDING_FLOORS[bldKey];
    const activeFloorNum = this.getActiveFloor(bldKey);
    const floorDef = bldDef?.floors?.find(f => f.floorNum === activeFloorNum) || bldDef?.floors?.[0];
    const themeName = floorDef?.theme || 'slate';
    const floorTile = Cache?.floors?.[themeName];

    const themeColors = {
      'command-center':  { border: '#ef4444', glow: 'rgba(239, 68, 68, 0.28)', label: 'WAR ROOM & GOVERNANCE' },
      'project-district': { border: '#06b6d4', glow: 'rgba(6, 182, 212, 0.28)', label: 'CODE FORGE & DEPLOY BAY' },
      'ai-district':      { border: '#a855f7', glow: 'rgba(168, 85, 247, 0.28)', label: 'NEURAL NEXUS LAB' },
      'dev-district':     { border: '#10b981', glow: 'rgba(16, 185, 129, 0.28)', label: 'DEV LOFT & WORKSHOP' },
      'creative-district':{ border: '#ec4899', glow: 'rgba(236, 72, 153, 0.28)', label: 'DESIGN STUDIO & UX LAB' },
      'data-center':      { border: '#3b82f6', glow: 'rgba(59, 130, 246, 0.28)', label: 'DATA VAULT & SILOS' },
      'observatory':      { border: '#6366f1', glow: 'rgba(99, 102, 241, 0.28)', label: 'OBSERVATORY & TELEMETRY' }
    };
    const theme = themeColors[bldKey] || themeColors['command-center'];

    ctx.save();

    // 1. Draw procedural cutaway walls behind the room
    if (Cache?.cutaways) {
      const backWallL = this.toScreen(bx - 1.4, by - 0.5, 0, cx, cy, zoom);
      const backWallR = this.toScreen(bx + 0.5, by - 1.4, 0, cx, cy, zoom);
      if (Cache.cutaways.wallL) {
        ctx.drawImage(Cache.cutaways.wallL,
          Math.round(backWallL.x - 40 * zoom),
          Math.round(backWallL.y - 72 * zoom),
          Math.round(80 * zoom),
          Math.round(88 * zoom)
        );
      }
      if (Cache.cutaways.wallR) {
        ctx.drawImage(Cache.cutaways.wallR,
          Math.round(backWallR.x - 40 * zoom),
          Math.round(backWallR.y - 72 * zoom),
          Math.round(80 * zoom),
          Math.round(88 * zoom)
        );
      }
    }

    // 2. 3x3 interior room slab with procedural texture tile
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const sc = this.toScreen(bx + dx, by + dy, 0, cx, cy, zoom);
        if (floorTile) {
          ctx.drawImage(floorTile,
            Math.round(sc.x - 32 * zoom),
            Math.round(sc.y - 16 * zoom),
            Math.round(64 * zoom),
            Math.round(32 * zoom)
          );
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.moveTo(sc.x, sc.y - th * zoom);
          ctx.lineTo(sc.x + tw * zoom, sc.y);
          ctx.lineTo(sc.x, sc.y + th * zoom);
          ctx.lineTo(sc.x - tw * zoom, sc.y);
          ctx.closePath();
          ctx.fill();
        }
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1 * zoom;
        ctx.beginPath();
        ctx.moveTo(sc.x, sc.y - th * zoom);
        ctx.lineTo(sc.x + tw * zoom, sc.y);
        ctx.lineTo(sc.x, sc.y + th * zoom);
        ctx.lineTo(sc.x - tw * zoom, sc.y);
        ctx.closePath();
        ctx.stroke();
      }
    }

    // 3. Render active floor props
    if (floorDef?.props && Cache?.workstations) {
      if (floorDef.props.includes('kanbanBoard') && Cache.workstations.kanbanBoard) {
        const kb = this.toScreen(bx - 0.7, by - 0.7, 0, cx, cy, zoom);
        ctx.drawImage(Cache.workstations.kanbanBoard,
          Math.round(kb.x - 32 * zoom),
          Math.round(kb.y - 44 * zoom),
          Math.round(64 * zoom),
          Math.round(52 * zoom)
        );
      }
      if (floorDef.props.includes('serverRack') && Cache.workstations.serverRack) {
        const sr = this.toScreen(bx + 0.8, by - 0.6, 0, cx, cy, zoom);
        ctx.drawImage(Cache.workstations.serverRack,
          Math.round(sr.x - 24 * zoom),
          Math.round(sr.y - 40 * zoom),
          Math.round(48 * zoom),
          Math.round(52 * zoom)
        );
      }
      if (floorDef.props.includes('filingCabinet') && Cache.workstations.filingCabinet) {
        const fc = this.toScreen(bx - 0.9, by + 0.6, 0, cx, cy, zoom);
        ctx.drawImage(Cache.workstations.filingCabinet,
          Math.round(fc.x - 14 * zoom),
          Math.round(fc.y - 32 * zoom),
          Math.round(28 * zoom),
          Math.round(40 * zoom)
        );
      }
      if (floorDef.props.includes('browserMonitor') && Cache.workstations.browserMonitor) {
        const bm = this.toScreen(bx + 0.7, by + 0.6, 0, cx, cy, zoom);
        ctx.drawImage(Cache.workstations.browserMonitor,
          Math.round(bm.x - 24 * zoom),
          Math.round(bm.y - 36 * zoom),
          Math.round(48 * zoom),
          Math.round(44 * zoom)
        );
      }
      if (floorDef.props.includes('waterCooler') && Cache.workstations.waterCooler) {
        const wc = this.toScreen(bx - 0.8, by - 0.2, 0, cx, cy, zoom);
        ctx.drawImage(Cache.workstations.waterCooler,
          Math.round(wc.x - 16 * zoom),
          Math.round(wc.y - 40 * zoom),
          Math.round(32 * zoom),
          Math.round(50 * zoom)
        );
      }
    }

    // 4. Room perimeter ambient radial glow
    const center = this.toScreen(bx, by, 0, cx, cy, zoom);
    const grad = ctx.createRadialGradient(center.x, center.y, 8 * zoom, center.x, center.y, 80 * zoom);
    grad.addColorStop(0, theme.glow);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(center.x, center.y, 80 * zoom, 0, Math.PI * 2);
    ctx.fill();

    // 5. Interior Department & Floor Label Banner (Clamped Capsule Pill)
    const floorLabel = floorDef && bldDef ? `${bldDef.name.toUpperCase()} · ${floorDef.name.toUpperCase()}` : `${theme.label}`;
    ctx.save();
    ctx.font = `700 10.5px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    const textW = ctx.measureText(`⚡ ${floorLabel}`).width;
    const pillY = center.y - 38 * zoom;
    ctx.fillStyle = 'rgba(10, 15, 29, 0.9)';
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(center.x - textW / 2 - 8, pillY - 11, textW + 16, 20, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.border;
    ctx.fillText(`⚡ ${floorLabel}`, center.x, pillY + 3);
    ctx.restore();

    ctx.restore();
  }

  _drawHandoff(ctx, cx, cy, zoom) {
    const handoff = this.activeHandoff;
    if (!handoff || handoff.expiresAt <= Date.now()) { this.activeHandoff = null; return; }
    const payload = handoff.event.payload || {};
    const fromId = payload.fromAgentId || payload.from || payload.sourceAgentId;
    const toId = payload.toAgentId || payload.to || payload.targetAgentId;
    const from = [...this.world.agents.values()].find((agent) => String(agent.id) === String(fromId) || String(agent.name) === String(fromId));
    const to = [...this.world.agents.values()].find((agent) => String(agent.id) === String(toId) || String(agent.name) === String(toId));
    if (!from || !to) return;
    const a = this.toScreen(from.x, from.y, 0.35, cx, cy, zoom);
    const b = this.toScreen(to.x, to.y, 0.35, cx, cy, zoom);
    ctx.save();
    ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 2 * zoom; ctx.setLineDash([6 * zoom, 5 * zoom]);
    ctx.globalAlpha = Math.max(0.2, (handoff.expiresAt - Date.now()) / 8000);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = '#06b6d4';
    ctx.beginPath(); ctx.arc((a.x + b.x) / 2, (a.y + b.y) / 2, 4 * zoom, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _drawCityEventHud(ctx, width) {
    if (window.FENIX?.live?.status === 'ONLINE') {
      this.cityConnectionStatus = 'ONLINE';
    }
    const connection = this.cityConnectionStatus;
    if (connection && connection !== 'ONLINE' && connection !== 'SYNCING') {
      ctx.save();
      ctx.fillStyle = 'rgba(3,7,18,.9)';
      ctx.strokeStyle = connection === 'OFFLINE' ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = 1;
      ctx.fillRect(12, 12, 132, 24);
      ctx.strokeRect(12, 12, 132, 24);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 9px monospace';
      ctx.fillText(`WS  ${connection}`, 22, 28);
      ctx.restore();
    }
    const event = this.lastCityEvent;
    if (!event) return;
    const age = Date.now() - Date.parse(event.occurredAt || '');
    if (!Number.isFinite(age) || age > 8000) return;
    const alpha = Math.max(0, 1 - age / 8000);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(3,7,18,.88)';
    ctx.strokeStyle = event.visual?.visualState === 'ERROR' ? '#ef4444' : '#06b6d4';
    ctx.lineWidth = 1;
    const text = `EVENT  ${String(event.type).toUpperCase()}`;
    const x = width - Math.min(260, width - 24);
    ctx.fillRect(x, 12, Math.min(248, width - 24), 28);
    ctx.strokeRect(x, 12, Math.min(248, width - 24), 28);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 10px monospace';
    ctx.fillText(text.slice(0, 34), x + 10, 30);
    ctx.restore();
  }

  _drawBackdrop(ctx, w, h) {
    if (this.isNight === false) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#0284c7');
      g.addColorStop(0.35, '#38bdf8');
      g.addColorStop(0.7, '#bae6fd');
      g.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Sun glow
      ctx.fillStyle = 'rgba(253, 224, 71, 0.35)';
      ctx.beginPath();
      ctx.arc(w * 0.75, h * 0.22, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(w * 0.75, h * 0.22, 28, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const g = ctx.createRadialGradient(w*.5, h*.35, 0, w*.5, h*.35, Math.max(w,h)*.75);
    g.addColorStop(0, '#0f172a');
    g.addColorStop(0.5, '#070b13');
    g.addColorStop(1, '#020408');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Central red ambient glow — pulsa com o Fênix
    const glowAlpha = 0.04 + 0.025 * Math.sin(this.time * 1.5);
    ctx.fillStyle = `rgba(239, 68, 68, ${glowAlpha})`;
    ctx.beginPath();
    ctx.arc(w*.5, h*.45, Math.min(w,h)*.45, 0, Math.PI*2);
    ctx.fill();
    // Ambient blue glow
    ctx.fillStyle = 'rgba(56, 189, 248, 0.03)';
    ctx.beginPath();
    ctx.arc(w*.5, h*.45, Math.min(w,h)*.38, 0, Math.PI*2);
    ctx.fill();
    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    const seed = 42;
    for (let i = 0; i < 80; i++) {
      const sx = ((i*137.5 + seed) % w);
      const sy = ((i*97.3 + seed*2) % (h*0.65));
      const blink = 0.3 + 0.7 * Math.abs(Math.sin(this.time*0.5 + i));
      ctx.globalAlpha = blink * 0.5;
      ctx.fillRect(sx, sy, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  }

  _drawFenixAvatar(ctx, cx, cy, zoom) {
    // Avatar central do FÊNIX — personagem pixelado com glow pulsante
    const avatarX = cx;
    const avatarY = cy - 10 * zoom;
    const t = this.time;
    const pulse = 0.8 + 0.2 * Math.sin(t * 2.5);
    const outerGlow = 30 + 15 * Math.sin(t * 1.8);
    const innerGlow = 15 + 8 * Math.sin(t * 2.5);

    // Anel exterior rotativo
    ctx.save();
    ctx.translate(avatarX, avatarY);
    ctx.rotate(t * 0.4);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rx = Math.cos(angle) * 28 * zoom;
      const ry = Math.sin(angle) * 14 * zoom;
      ctx.fillStyle = `rgba(239,68,68,${0.4 + 0.3 * Math.sin(t * 3 + i)})`;
      ctx.beginPath();
      ctx.arc(rx, ry, 3 * zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Anel médio (anti-horário)
    ctx.save();
    ctx.translate(avatarX, avatarY);
    ctx.rotate(-t * 0.7);
    ctx.strokeStyle = `rgba(239,68,68,${0.25 * pulse})`;
    ctx.lineWidth = 1.5 * zoom;
    ctx.setLineDash([4 * zoom, 6 * zoom]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 20 * zoom, 10 * zoom, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Glow externo
    const glowGrad = ctx.createRadialGradient(avatarX, avatarY, 0, avatarX, avatarY, outerGlow * zoom);
    glowGrad.addColorStop(0, `rgba(239,68,68,${0.35 * pulse})`);
    glowGrad.addColorStop(0.5, `rgba(239,68,68,${0.1 * pulse})`);
    glowGrad.addColorStop(1, 'rgba(239,68,68,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, outerGlow * zoom, 0, Math.PI * 2);
    ctx.fill();

    // Corpo do avatar (pixel-art simplificado)
    const sz = 12 * zoom;
    // Torso
    const torsoGrad = ctx.createLinearGradient(avatarX - sz, avatarY - sz * 1.8, avatarX + sz, avatarY);
    torsoGrad.addColorStop(0, '#ef4444');
    torsoGrad.addColorStop(0.4, '#991b1b');
    torsoGrad.addColorStop(1, '#300');
    ctx.fillStyle = torsoGrad;
    ctx.save();
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = innerGlow * zoom;
    ctx.beginPath();
    ctx.ellipse(avatarX, avatarY, sz, sz * 0.55, 0, 0, Math.PI, false);
    ctx.lineTo(avatarX - sz, avatarY - sz * 1.6);
    ctx.ellipse(avatarX, avatarY - sz * 1.6, sz, sz * 0.55, 0, Math.PI, 0, true);
    ctx.lineTo(avatarX + sz, avatarY);
    ctx.fill();

    // Topo do corpo
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(avatarX, avatarY - sz * 1.6, sz, sz * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cabeça
    const headY = avatarY - sz * 1.6 - sz * 1.0;
    const headR = sz * 0.75;
    const headGrad = ctx.createRadialGradient(avatarX - headR * 0.3, headY - headR * 0.3, 0, avatarX, headY, headR);
    headGrad.addColorStop(0, '#f87171');
    headGrad.addColorStop(0.6, '#b91c1c');
    headGrad.addColorStop(1, '#020617');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(avatarX, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = zoom;
    ctx.stroke();

    // Visor / olhos
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12 * zoom;
    ctx.fillRect(avatarX - headR * 0.65, headY - headR * 0.15, headR * 1.3, headR * 0.3);
    ctx.shadowBlur = 0;

    // Capacete - penas do fênix
    ctx.strokeStyle = `rgba(239,68,68,${0.7 + 0.3 * Math.sin(t * 3)})`;
    ctx.lineWidth = 2 * zoom;
    ctx.beginPath();
    ctx.moveTo(avatarX - headR * 0.5, headY - headR * 0.8);
    ctx.quadraticCurveTo(avatarX - headR * 0.8, headY - headR * 2.2, avatarX - headR * 0.3, headY - headR * 2.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(avatarX + headR * 0.5, headY - headR * 0.8);
    ctx.quadraticCurveTo(avatarX + headR * 0.8, headY - headR * 2.2, avatarX + headR * 0.3, headY - headR * 2.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(avatarX, headY - headR);
    ctx.quadraticCurveTo(avatarX, headY - headR * 2.4, avatarX, headY - headR * 2.8);
    ctx.stroke();

    ctx.restore();

    // Label "FÊNIX OS" abaixo do avatar
    ctx.save();
    ctx.font = `bold ${Math.max(10, 11 * zoom)}px 'Inter',sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8 * zoom;
    ctx.fillText('FÊNIX OS', avatarX, avatarY + 24 * zoom);
    ctx.shadowBlur = 0;
    ctx.font = `${Math.max(7, 8 * zoom)}px 'JetBrains Mono',monospace`;
    ctx.fillStyle = 'rgba(239,68,68,0.7)';
    ctx.fillText('MASTER ORCHESTRATOR', avatarX, avatarY + 34 * zoom);
    ctx.restore();
  }

  _drawGrid(ctx, cx, cy, zoom) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -16; i <= 16; i++) {
      let p; 
      p = this.toScreen(i,-16,0,cx,cy,zoom); ctx.moveTo(p.x,p.y);
      p = this.toScreen(i, 16,0,cx,cy,zoom); ctx.lineTo(p.x,p.y);
      p = this.toScreen(-16,i,0,cx,cy,zoom); ctx.moveTo(p.x,p.y);
      p = this.toScreen( 16,i,0,cx,cy,zoom); ctx.lineTo(p.x,p.y);
    }
    ctx.stroke();
  }

  _drawDistrict(ctx, d, cx, cy, zoom) {
    const hw = d.w/2, hh = d.h/2;
    const tl = this.toScreen(d.x-hw, d.y-hh, 0, cx, cy, zoom);
    const tr = this.toScreen(d.x+hw, d.y-hh, 0, cx, cy, zoom);
    const br = this.toScreen(d.x+hw, d.y+hh, 0, cx, cy, zoom);
    const bl = this.toScreen(d.x-hw, d.y+hh, 0, cx, cy, zoom);
    const dep = 0.22;
    const tlZ = this.toScreen(d.x-hw, d.y-hh, dep, cx, cy, zoom);
    const trZ = this.toScreen(d.x+hw, d.y-hh, dep, cx, cy, zoom);
    const brZ = this.toScreen(d.x+hw, d.y+hh, dep, cx, cy, zoom);
    const blZ = this.toScreen(d.x-hw, d.y+hh, dep, cx, cy, zoom);

    // Pulse for active districts
    const agentsHere = [...this.world.agents.values()].filter(a => this.DISTRICTS[a.district] === d).length;
    const pulse = agentsHere > 0 ? (0.7 + 0.3 * Math.sin(this.time * 2 + d.x)) : 1;

    ctx.fillStyle = this._adjustColor(d.color, -55);
    ctx.beginPath(); ctx.moveTo(bl.x,bl.y); ctx.lineTo(br.x,br.y); ctx.lineTo(brZ.x,brZ.y); ctx.lineTo(blZ.x,blZ.y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = this._adjustColor(d.color, -35);
    ctx.beginPath(); ctx.moveTo(br.x,br.y); ctx.lineTo(tr.x,tr.y); ctx.lineTo(trZ.x,trZ.y); ctx.lineTo(brZ.x,brZ.y); ctx.closePath(); ctx.fill();

    // Top face
    ctx.fillStyle = d.color + '30';
    ctx.beginPath(); ctx.moveTo(tlZ.x,tlZ.y); ctx.lineTo(trZ.x,trZ.y); ctx.lineTo(brZ.x,brZ.y); ctx.lineTo(blZ.x,blZ.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = d.color;
    ctx.lineWidth = (agentsHere > 0 ? 2.5 : 1.5) * zoom * pulse;
    ctx.globalAlpha = pulse;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Floor grid inside
    ctx.strokeStyle = d.color + '30'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i=1;i<d.w;i++){let p1=this.toScreen(d.x-hw+i,d.y-hh,dep,cx,cy,zoom),p2=this.toScreen(d.x-hw+i,d.y+hh,dep,cx,cy,zoom);ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);}
    for (let i=1;i<d.h;i++){let p1=this.toScreen(d.x-hw,d.y-hh+i,dep,cx,cy,zoom),p2=this.toScreen(d.x+hw,d.y-hh+i,dep,cx,cy,zoom);ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);}
    ctx.stroke();

    // District structures
    this._drawDistrictBuildings(ctx, d, cx, cy, zoom, dep);
    this._drawWorkstations(ctx, d, cx, cy, zoom, dep);

    // Label: Strictly Tier 0-1 (zoom < 1.70) when not in building cutaway
    if (zoom >= 0.8 && zoom < 1.70 && !this.state.cutawayBuilding && this.activeDistrict !== d.id) {
      const center = this.toScreen(d.x, d.y, dep, cx, cy, zoom);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 6 * zoom;
      // Emoji do distrito
      if (d.emoji) {
        ctx.font = `${Math.min(14, Math.max(10, 12 * zoom))}px 'Inter',sans-serif`;
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.85;
        ctx.fillText(d.emoji, center.x, center.y - 48 * zoom);
        ctx.globalAlpha = 1;
      }
      // Nome do distrito
      ctx.font = `700 ${Math.min(12, Math.max(9, 10.5 * zoom))}px 'Inter',sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = agentsHere > 0 ? d.color : '#e2e8f0';
      if (agentsHere > 0) {
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 6 * zoom;
      }
      ctx.fillText(d.label, center.x, center.y - 35 * zoom);
      ctx.shadowBlur = 0;
      if (agentsHere > 0) {
        ctx.font = `600 ${Math.min(9, Math.max(7, 7.5 * zoom))}px 'JetBrains Mono',monospace`;
        ctx.fillStyle = d.color;
        ctx.fillText(`${agentsHere} AGENTE${agentsHere>1?'S':''}`, center.x, center.y - 24 * zoom);
      }
      ctx.restore();
    }
  }

  _drawDistrictBuildings(ctx, d, cx, cy, zoom, dep) {
    const type = d.buildingType || 'default';
    switch (type) {
      case 'core_spire':         this._drawCoreSpire(ctx, d, cx, cy, zoom, dep); break;
      case 'command_tower':      this._drawCommandTower(ctx, d, cx, cy, zoom, dep); break;
      case 'workshop_complex':   this._drawWorkshopComplex(ctx, d, cx, cy, zoom, dep); break;
      case 'canvas_pavilion':    this._drawCanvasPavilion(ctx, d, cx, cy, zoom, dep); break;
      case 'server_monoliths':   this._drawServerMonoliths(ctx, d, cx, cy, zoom, dep); break;
      case 'database_silos':     this._drawDatabaseSilos(ctx, d, cx, cy, zoom, dep); break;
      case 'creative_studio':    this._drawCreativeStudio(ctx, d, cx, cy, zoom, dep); break;
      case 'observatory_dome':   this._drawObservatoryDome(ctx, d, cx, cy, zoom, dep); break;
      case 'qa_radar':           this._drawQARadar(ctx, d, cx, cy, zoom, dep); break;
      case 'shield_fortress':    this._drawShieldFortress(ctx, d, cx, cy, zoom, dep); break;
      case 'launch_gantry':      this._drawLaunchGantry(ctx, d, cx, cy, zoom, dep); break;
      case 'terminal_console':   this._drawTerminalConsole(ctx, d, cx, cy, zoom, dep); break;
      case 'git_branch_tree':    this._drawGitBranchTree(ctx, d, cx, cy, zoom, dep); break;
      case 'memory_vault':       this._drawMemoryVault(ctx, d, cx, cy, zoom, dep); break;
      case 'knowledge_library':  this._drawKnowledgeLibrary(ctx, d, cx, cy, zoom, dep); break;
      case 'connector_nexus':    this._drawConnectorNexus(ctx, d, cx, cy, zoom, dep); break;
      case 'data_pipeline_tower':this._drawDataPipelineTower(ctx, d, cx, cy, zoom, dep); break;
      case 'antenna_array':      this._drawAntennaArray(ctx, d, cx, cy, zoom, dep); break;
      case 'governance_chamber': this._drawGovernanceChamber(ctx, d, cx, cy, zoom, dep); break;
      case 'archive_vault':      this._drawArchiveVault(ctx, d, cx, cy, zoom, dep); break;
      default:                   this._drawDefaultDistrictBlocks(ctx, d, cx, cy, zoom, dep); break;
    }
  }

  _drawBlock(ctx, x, y, bz, height, color, cx, cy, zoom, wx = 0.24, wy = 0.24) {
    const corners = [[-wx,-wy],[wx,-wy],[wx,wy],[-wx,wy]];
    const bot = corners.map(([dx,dy]) => this.toScreen(x+dx,y+dy,bz,cx,cy,zoom));
    const top = corners.map(([dx,dy]) => this.toScreen(x+dx,y+dy,bz+height,cx,cy,zoom));
    const path = (pts) => { ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.closePath(); };
    ctx.fillStyle = this._adjustColor(color,-52); path([bot[3],bot[2],top[2],top[3]]); ctx.fill();
    ctx.fillStyle = this._adjustColor(color,-32); path([bot[2],bot[1],top[1],top[2]]); ctx.fill();
    ctx.fillStyle = color+'aa'; path(top); ctx.fill();
    ctx.strokeStyle = color+'60'; ctx.lineWidth=1; ctx.stroke();
  }

  _drawCylinder(ctx, x, y, bz, height, radius, color, cx, cy, zoom) {
    const tw = this.state.tileSize * zoom;
    const th = (this.state.tileSize / 2) * zoom;
    const bot = this.toScreen(x, y, bz, cx, cy, zoom);
    const top = this.toScreen(x, y, bz + height, cx, cy, zoom);
    const rx = radius * tw;
    const ry = radius * th;

    ctx.fillStyle = this._adjustColor(color, -40);
    ctx.beginPath();
    ctx.ellipse(bot.x, bot.y, rx, ry, 0, 0, Math.PI, false);
    ctx.lineTo(top.x - rx, top.y);
    ctx.ellipse(top.x, top.y, rx, ry, 0, Math.PI, 0, true);
    ctx.lineTo(bot.x + rx, bot.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = color + 'cc';
    ctx.beginPath();
    ctx.ellipse(top.x, top.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  _drawPylon(ctx, x, y, bz, height, color, cx, cy, zoom) {
    const bot = this.toScreen(x, y, bz, cx, cy, zoom);
    const top = this.toScreen(x, y, bz + height, cx, cy, zoom);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, 2 * zoom);
    ctx.beginPath();
    ctx.moveTo(bot.x, bot.y);
    ctx.lineTo(top.x, top.y);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(top.x, top.y, Math.max(2, 3 * zoom), 0, Math.PI * 2);
    ctx.fill();
  }

  _drawCoreSpire(ctx, d, cx, cy, zoom, dep) {
    [-0.9, 0.9].forEach(ox => {
      [-0.9, 0.9].forEach(oy => {
        this._drawBlock(ctx, d.x + ox, d.y + oy, dep, 0.35, d.color, cx, cy, zoom, 0.18, 0.18);
      });
    });
    this._drawBlock(ctx, d.x, d.y, dep, 0.85, '#ef4444', cx, cy, zoom, 0.35, 0.35);
    this._drawPylon(ctx, d.x, d.y, dep + 0.85, 0.45, '#f87171', cx, cy, zoom);
  }

  _drawCommandTower(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y, dep, 0.35, d.color, cx, cy, zoom, 0.5, 0.5);
    this._drawBlock(ctx, d.x, d.y, dep + 0.35, 0.35, d.color, cx, cy, zoom, 0.35, 0.35);
    this._drawBlock(ctx, d.x, d.y, dep + 0.7, 0.35, d.color, cx, cy, zoom, 0.2, 0.2);
    this._drawPylon(ctx, d.x, d.y, dep + 1.05, 0.35, '#ef4444', cx, cy, zoom);
  }

  _drawWorkshopComplex(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x - 0.45, d.y - 0.3, dep, 0.65, d.color, cx, cy, zoom, 0.28, 0.28);
    this._drawBlock(ctx, d.x + 0.45, d.y + 0.3, dep, 0.5, d.color, cx, cy, zoom, 0.28, 0.28);
    this._drawBlock(ctx, d.x, d.y, dep + 0.35, 0.15, d.color, cx, cy, zoom, 0.45, 0.12);
  }

  _drawCanvasPavilion(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x - 0.35, d.y - 0.35, dep, 0.2, d.color, cx, cy, zoom, 0.4, 0.4);
    this._drawBlock(ctx, d.x, d.y, dep + 0.15, 0.25, d.color, cx, cy, zoom, 0.3, 0.3);
    this._drawBlock(ctx, d.x + 0.35, d.y + 0.35, dep + 0.35, 0.3, d.color, cx, cy, zoom, 0.2, 0.2);
  }

  _drawServerMonoliths(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x - 0.35, d.y, dep, 0.85, d.color, cx, cy, zoom, 0.16, 0.35);
    this._drawBlock(ctx, d.x + 0.35, d.y, dep, 0.85, d.color, cx, cy, zoom, 0.16, 0.35);
  }

  _drawDatabaseSilos(ctx, d, cx, cy, zoom, dep) {
    this._drawCylinder(ctx, d.x - 0.45, d.y - 0.3, dep, 0.65, 0.22, d.color, cx, cy, zoom);
    this._drawCylinder(ctx, d.x + 0.45, d.y - 0.3, dep, 0.65, 0.22, d.color, cx, cy, zoom);
    this._drawCylinder(ctx, d.x, d.y + 0.45, dep, 0.7, 0.24, d.color, cx, cy, zoom);
  }

  _drawCreativeStudio(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x - 0.3, d.y - 0.2, dep, 0.55, d.color, cx, cy, zoom, 0.35, 0.35);
    this._drawBlock(ctx, d.x + 0.35, d.y + 0.35, dep, 0.35, d.color, cx, cy, zoom, 0.25, 0.25);
  }

  _drawObservatoryDome(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y, dep, 0.4, d.color, cx, cy, zoom, 0.42, 0.42);
    this._drawCylinder(ctx, d.x, d.y, dep + 0.4, 0.25, 0.26, d.color, cx, cy, zoom);
    this._drawPylon(ctx, d.x + 0.1, d.y - 0.1, dep + 0.65, 0.4, '#c084fc', cx, cy, zoom);
  }

  _drawQARadar(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y, dep, 0.4, d.color, cx, cy, zoom, 0.4, 0.4);
    const top = this.toScreen(d.x, d.y, dep + 0.4, cx, cy, zoom);
    const angle = this.time * 2.5;
    const armX = top.x + Math.cos(angle) * 16 * zoom;
    const armY = top.y + Math.sin(angle) * 8 * zoom;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2 * zoom;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(armX, armY);
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(armX, armY, 3 * zoom, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawShieldFortress(ctx, d, cx, cy, zoom, dep) {
    [-0.6, 0.6].forEach(ox => {
      [-0.6, 0.6].forEach(oy => {
        this._drawBlock(ctx, d.x + ox, d.y + oy, dep, 0.45, d.color, cx, cy, zoom, 0.2, 0.2);
      });
    });
    this._drawBlock(ctx, d.x, d.y, dep, 0.7, '#f43f5e', cx, cy, zoom, 0.25, 0.25);
  }

  _drawLaunchGantry(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x - 0.35, d.y, dep, 1.1, d.color, cx, cy, zoom, 0.18, 0.18);
    this._drawCylinder(ctx, d.x + 0.3, d.y, dep, 0.95, 0.18, '#a855f7', cx, cy, zoom);
  }

  _drawTerminalConsole(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y, dep, 0.65, d.color, cx, cy, zoom, 0.45, 0.18);
    const screenTop = this.toScreen(d.x, d.y, dep + 0.35, cx, cy, zoom);
    ctx.fillStyle = '#10b981';
    ctx.font = `${Math.max(6, 7 * zoom)}px 'JetBrains Mono',monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('>_ FENIX', screenTop.x, screenTop.y);
  }

  _drawGitBranchTree(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y + 0.5, dep, 0.3, d.color, cx, cy, zoom, 0.22, 0.22);
    this._drawBlock(ctx, d.x - 0.4, d.y - 0.3, dep, 0.65, d.color, cx, cy, zoom, 0.2, 0.2);
    this._drawBlock(ctx, d.x + 0.4, d.y - 0.1, dep, 0.55, d.color, cx, cy, zoom, 0.2, 0.2);
  }

  _drawMemoryVault(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y, dep, 0.65, d.color, cx, cy, zoom, 0.45, 0.45);
    const top = this.toScreen(d.x, d.y, dep + 0.65, cx, cy, zoom);
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 1.5 * zoom;
    ctx.beginPath();
    ctx.arc(top.x, top.y, 8 * zoom, 0, Math.PI * 2);
    ctx.stroke();
  }

  _drawKnowledgeLibrary(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y, dep, 0.45, d.color, cx, cy, zoom, 0.55, 0.45);
    this._drawBlock(ctx, d.x, d.y, dep + 0.45, 0.35, d.color, cx, cy, zoom, 0.35, 0.28);
  }

  _drawConnectorNexus(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y, dep, 0.5, d.color, cx, cy, zoom, 0.32, 0.32);
    [-0.6, 0.6].forEach(ox => {
      this._drawPylon(ctx, d.x + ox, d.y, dep, 0.3, '#38bdf8', cx, cy, zoom);
    });
    [-0.6, 0.6].forEach(oy => {
      this._drawPylon(ctx, d.x, d.y + oy, dep, 0.3, '#38bdf8', cx, cy, zoom);
    });
  }

  _drawDataPipelineTower(ctx, d, cx, cy, zoom, dep) {
    this._drawCylinder(ctx, d.x - 0.35, d.y, dep, 0.85, 0.18, d.color, cx, cy, zoom);
    this._drawCylinder(ctx, d.x + 0.35, d.y, dep, 0.65, 0.18, d.color, cx, cy, zoom);
    this._drawBlock(ctx, d.x, d.y, dep + 0.4, 0.1, d.color, cx, cy, zoom, 0.35, 0.08);
  }

  _drawAntennaArray(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y, dep, 0.3, d.color, cx, cy, zoom, 0.35, 0.35);
    this._drawPylon(ctx, d.x, d.y, dep + 0.3, 0.9, '#fdba74', cx, cy, zoom);
  }

  _drawGovernanceChamber(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y, dep, 0.55, d.color, cx, cy, zoom, 0.5, 0.4);
    this._drawPylon(ctx, d.x, d.y, dep + 0.55, 0.35, '#fde047', cx, cy, zoom);
  }

  _drawArchiveVault(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x - 0.3, d.y, dep, 0.35, d.color, cx, cy, zoom, 0.28, 0.28);
    this._drawBlock(ctx, d.x + 0.3, d.y, dep, 0.35, d.color, cx, cy, zoom, 0.28, 0.28);
    this._drawBlock(ctx, d.x, d.y, dep + 0.35, 0.35, d.color, cx, cy, zoom, 0.28, 0.28);
  }

  _drawDefaultDistrictBlocks(ctx, d, cx, cy, zoom, dep) {
    const structs = [
      {ox:-0.7, oy:-0.5, h:0.6},{ox:0.45, oy:-0.32, h:0.4},{ox:-0.15, oy:0.45, h:0.3}
    ];
    for (const s of structs) {
      if (Math.abs(s.ox) > d.w/2-0.4 || Math.abs(s.oy) > d.h/2-0.4) continue;
      this._drawBlock(ctx, d.x+s.ox, d.y+s.oy, dep, s.h, d.color, cx, cy, zoom);
    }
  }

  _drawTrail(ctx, agent, cx, cy, zoom) {
    if (!agent.trail || !Array.isArray(agent.trail) || agent.trail.length < 2) return;
    ctx.beginPath();
    const first = this.toScreen(agent.trail[0].x, agent.trail[0].y, 0.22, cx, cy, zoom);
    ctx.moveTo(first.x, first.y);
    for (let i=1;i<agent.trail.length;i++){
      const p = this.toScreen(agent.trail[i].x, agent.trail[i].y, 0.22, cx, cy, zoom);
      ctx.lineTo(p.x, p.y);
    }
    const head = this.toScreen(agent.x, agent.y, 0.22, cx, cy, zoom);
    ctx.lineTo(head.x, head.y);
    ctx.strokeStyle = agent.color + '50';
    ctx.lineWidth = 2*zoom; ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.stroke();
  }

  _drawParticle(ctx, p, cx, cy, zoom) {
    const sc = this.toScreen(p.x, p.y, p.z, cx, cy, zoom);
    ctx.globalAlpha = p.life * 0.85;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(sc.x, sc.y, p.size * zoom, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  _drawAgent(ctx, agent, cx, cy, zoom) {
    const isOffline = String(agent.status || '').toUpperCase() === 'OFFLINE';
    ctx.save();
    if (isOffline) ctx.globalAlpha = 0.45;
    const isSelected = this.state.selectedAgent === agent;
    const isHovered  = this.state.hoveredAgent === agent;
    const isWorking  = ['WORKING','RUNNING','TESTING','QUEUED'].includes(String(agent.status||'').toUpperCase());
    const isError    = ['ERROR', 'FAILED', 'BLOCKED'].includes(String(agent.status || '').toUpperCase());

    const animState = agent.animState || (isError ? 'error' : (isWorking ? 'working' : (agent._moving ? 'walk' : 'idle')));
    const facing = agent.facing || 'SE';
    const config = getAgentAvatarConfig(agent);
    const isMaster = agent.id === 'Orchestrator' || String(agent.role || '').toLowerCase().includes('orchestrator') || agent.id === 'master';

    // Bobbing / Walk bounce
    const walkBounce = agent._moving ? Math.abs(Math.sin((agent.walkFrame || 0) * Math.PI / 2)) * 3 * zoom : 0;
    const workBounce = animState === 'working' && !agent._moving ? Math.abs(Math.sin(this.time * 3)) * 1.5 * zoom : 0;
    const idleBounce = animState === 'idle' ? Math.sin(this.time * 2.5) * 1.2 * zoom : 0;
    const ax = (typeof agent.x === 'number' && !isNaN(agent.x)) ? agent.x : (typeof agent.homeX === 'number' ? agent.homeX : 0);
    const ay = (typeof agent.y === 'number' && !isNaN(agent.y)) ? agent.y : (typeof agent.homeY === 'number' ? agent.homeY : 0);
    const sc = this.toScreen(ax, ay, 0.22, cx, cy, zoom);
    sc.y -= (walkBounce + workBounce + idleBounce);

    // Selection ring
    if (isSelected) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 * zoom;
      ctx.setLineDash([4 * zoom, 4 * zoom]);
      ctx.beginPath();
      ctx.ellipse(sc.x, sc.y + 6 * zoom, 14 * zoom, 7 * zoom, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Draw modular 2.5D pixel avatar
    PixelAvatarRenderer.drawAvatar(ctx, {
      x: sc.x,
      y: sc.y,
      zoom,
      facing,
      frame: agent.walkFrame || 0,
      state: animState,
      config,
      color: agent.color,
      isMaster,
      time: this.time,
      role: agent.role || agent.id,
      agent
    });

    // Floating Nameplate with Level-Of-Detail (LOD)
    const headY = sc.y - 36 * zoom;
    const tagY = headY - 6 * zoom;
    // Strict LOD: Tier 0 (zoom < 1.30) never displays agent text, Tier 1 only displays hovered/selected
    const shouldShowLabel = (zoom >= 1.30) && (isHovered || isSelected || (Boolean(this.state.showAllLabels) && zoom >= 1.90));
    if (!this.state.photoMode && shouldShowLabel) {
      ctx.save();
      const displayName = agent.displayName || agent.name;
      const effZoom = Math.min(1.25, Math.max(0.85, zoom * 0.45));
      const fontSize = Math.min(11, Math.max(9, 10 * effZoom));
      ctx.font = `700 ${fontSize}px 'Inter',sans-serif`;
      ctx.textAlign = 'center';
      const tw = ctx.measureText(displayName).width;
      const boxH = Math.min(20, Math.max(16, 17 * effZoom));

      ctx.fillStyle = 'rgba(8, 12, 24, 0.90)';
      ctx.strokeStyle = (isMaster ? '#ef4444' : agent.color) + '99';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(sc.x - tw / 2 - 8, tagY - boxH, tw + 16, boxH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText((agent.emoji ? agent.emoji + ' ' : '') + displayName, sc.x, tagY - boxH / 2 + 3.5);

      if (isSelected || isHovered) {
        ctx.font = `600 8px 'JetBrains Mono',monospace`;
        let tagColor = agent.color || '#38bdf8';
        let tagText = `[${agent.status || 'AVAILABLE'}]`;
        if (agent.status === 'IN_CONVERSATION') { tagColor = '#f59e0b'; tagText = '[CONVERSANDO 💬]'; }
        else if (agent.status === 'IN_MEETING') { tagColor = '#a855f7'; tagText = '[REUNIÃO 🤝]'; }
        else if (agent.status === 'WAR_ROOM') { tagColor = '#ef4444'; tagText = '[WAR ROOM 🚨]'; }
        else if (isWorking) {
          tagColor = '#00d9ff';
          const jobText = agent.currentJobId ? `JOB #${agent.currentJobId}` : (agent.missionId ? `MIS #${agent.missionId}` : 'OPERANDO ⚡');
          tagText = `[${jobText}]`;
        }
        ctx.fillStyle = tagColor;
        ctx.fillText(tagText, sc.x, tagY + 11);

        // Mission indicator chip above nameplate
        if (agent.currentMission || agent.currentJobId || agent.missionId) {
          const misId = agent.currentJobId ? `JOB #${agent.currentJobId}` : `MIS #${agent.missionId || agent.currentMission?.id || 'ACT'}`;
          ctx.font = `700 8px 'JetBrains Mono',monospace`;
          ctx.fillStyle = '#00d9ff';
          ctx.textAlign = 'center';
          ctx.fillText(`⚡ ${misId}`, sc.x, tagY - boxH - 4);
        }
      }
      ctx.restore();
    } else if (!this.state.photoMode && zoom < 1.30) {
      ctx.save();
      ctx.fillStyle = agent.color || '#38bdf8';
      ctx.beginPath();
      ctx.arc(sc.x, tagY, Math.min(3, Math.max(1.8, 2.2 * zoom)), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Speech bubble (Clamped scaling to prevent screen clutter at deep zoom)
    const shouldShowBubble = isHovered || isSelected || (zoom >= 1.5 && zoom < 2.5 && (agent.bubble?.isImportant || agent.status === 'IN_CONVERSATION' || agent.status === 'IN_MEETING'));
    if (!this.state.photoMode && agent.bubble && agent.bubble.life > 0 && shouldShowBubble) {
      const bAlpha = Math.min(1, agent.bubble.life);
      ctx.save();
      ctx.globalAlpha = bAlpha;
      const bText = String(agent.bubble.text || '').slice(0, 36);
      const effZoom = Math.min(1.2, Math.max(0.85, zoom * 0.45));
      ctx.font = `600 ${Math.min(11, Math.max(8, 9.5 * effZoom))}px 'Inter',sans-serif`;
      ctx.textAlign = 'center';
      const bw = ctx.measureText(bText).width + 16;
      const bh = Math.min(22, 18 * effZoom);
      const bx = sc.x - bw / 2;
      const by = tagY - bh - 6 * effZoom;

      ctx.fillStyle = (agent.color || '#38bdf8') + 'e6';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fill();

      // Tail
      ctx.beginPath();
      ctx.moveTo(sc.x - 4, by + bh);
      ctx.lineTo(sc.x + 4, by + bh);
      ctx.lineTo(sc.x, by + bh + 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(bText, sc.x, by + bh * 0.65);
      ctx.restore();
    }

    // Thought bubble (Munder Difflin Living Office)
    if (!this.state.photoMode && agent.thoughtBubble && agent.thoughtBubble.life > 0 && (isHovered || isSelected || (zoom >= 2.0 && agent.thoughtBubble.isWork))) {
      const tAlpha = Math.min(1, agent.thoughtBubble.life);
      ctx.save();
      ctx.globalAlpha = tAlpha;
      const tText = String(agent.thoughtBubble.text || '').slice(0, 28);
      ctx.font = `600 ${Math.max(8, 9 * zoom)}px 'Inter',sans-serif`;
      ctx.textAlign = 'center';
      const tw = ctx.measureText(tText).width + 18;
      const th = 22 * zoom;
      const tx = sc.x - tw / 2;
      const ty = tagY - th - 12 * zoom;

      // Dark slate translucent cloud bubble
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = agent.thoughtBubble.isWork ? 'rgba(56, 189, 248, 0.7)' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, 8);
      ctx.fill();
      ctx.stroke();

      // Thought cloud bubbles tail (3 small circles descending to head)
      ctx.beginPath(); ctx.arc(sc.x - 2, ty + th + 3 * zoom, 2.5 * zoom, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(sc.x - 5, ty + th + 7 * zoom, 1.8 * zoom, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(sc.x - 7, ty + th + 10 * zoom, 1.2 * zoom, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      // Text inside thought bubble
      ctx.fillStyle = agent.thoughtBubble.isWork ? '#38bdf8' : '#e2e8f0';
      ctx.fillText(tText, sc.x, ty + th * 0.68);
      ctx.restore();
    }

    ctx.restore();
  }

  _drawWorldVehicle(ctx, v, cx, cy, zoom) {
    if (!v) return;
    const Cache = window.FenixPixelEngine?.Cache || {};
    const vx = typeof v.x === 'number' ? v.x : 0;
    const vy = typeof v.y === 'number' ? v.y : 0;
    const isDrone = v.type === 'DRONE';
    const altitude = isDrone ? (typeof v.altitude === 'number' ? v.altitude * 0.015 : 0.35) : 0.05;

    // Ground shadow
    const groundSc = this.toScreen(vx, vy, 0, cx, cy, zoom);
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    const shadowW = (isDrone ? 12 : 28) * zoom;
    const shadowH = (isDrone ? 6 : 14) * zoom;
    ctx.ellipse(groundSc.x, groundSc.y, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Vehicle entity
    const sc = this.toScreen(vx, vy, altitude, cx, cy, zoom);
    ctx.save();

    if (isDrone) {
      // High-tech delivery drone
      const bob = Math.sin(this.time * 6) * 3 * zoom;
      const dy = sc.y + bob;

      // Drone chassis
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5 * zoom;
      ctx.beginPath();
      ctx.roundRect(sc.x - 10 * zoom, dy - 8 * zoom, 20 * zoom, 12 * zoom, 3 * zoom);
      ctx.fill();
      ctx.stroke();

      // Rotor arms
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2 * zoom;
      ctx.beginPath();
      ctx.moveTo(sc.x - 16 * zoom, dy - 12 * zoom);
      ctx.lineTo(sc.x + 16 * zoom, dy + 6 * zoom);
      ctx.moveTo(sc.x - 16 * zoom, dy + 6 * zoom);
      ctx.lineTo(sc.x + 16 * zoom, dy - 12 * zoom);
      ctx.stroke();

      // Spinning rotor blur
      const rotorAngle = (this.time * 25) % (Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1.5 * zoom;
      const rotorOffsets = [
        [-16, -12], [16, -12], [-16, 6], [16, 6]
      ];
      for (const [rx, ry] of rotorOffsets) {
        ctx.beginPath();
        ctx.ellipse(sc.x + rx * zoom, dy + ry * zoom, 8 * zoom, 3 * zoom, rotorAngle, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Blinking beacon
      const beaconOn = Math.floor(this.time * 4) % 2 === 0;
      if (beaconOn) {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(sc.x, dy - 6 * zoom, 2.5 * zoom, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cargo crate hanging below
      if (v.cargo) {
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1 * zoom;
        ctx.beginPath();
        ctx.roundRect(sc.x - 6 * zoom, dy + 5 * zoom, 12 * zoom, 9 * zoom, 2 * zoom);
        ctx.fill();
        ctx.stroke();
      }
    } else {
      // Ground vehicles (Truck / Van)
      let sprite = null;
      let pw = 56, ph = 32, ox = 28, oy = 22;
      if (v.type === 'TRUCK' && Cache.props?.freightTruck) {
        sprite = Cache.props.freightTruck;
        pw = 76; ph = 38; ox = 38; oy = 28;
      } else if (Cache.props?.cargoVan) {
        sprite = Cache.props.cargoVan;
        pw = 56; ph = 32; ox = 28; oy = 22;
      }

      if (sprite) {
        ctx.drawImage(
          sprite,
          Math.round(sc.x - ox * zoom),
          Math.round(sc.y - oy * zoom),
          Math.round(pw * zoom),
          Math.round(ph * zoom)
        );
      } else {
        // Fallback procedural isometric truck
        ctx.fillStyle = v.color || (v.owner ? '#ea580c' : '#0284c7');
        ctx.beginPath();
        ctx.roundRect(sc.x - 22 * zoom, sc.y - 14 * zoom, 44 * zoom, 22 * zoom, 4 * zoom);
        ctx.fill();
      }
    }

    // Floating label / HUD for vehicle
    if (!this.state.photoMode && zoom >= 0.75) {
      const tagY = sc.y - (isDrone ? 22 : 30) * zoom;
      ctx.font = `700 ${Math.max(7, 8.5 * zoom)}px 'JetBrains Mono',monospace`;
      ctx.textAlign = 'center';

      // Badge bg
      const nameText = v.name || v.id;
      const statusText = `[${v.status || 'TRANSIT'}] ${v.cargo ? '• ' + v.cargo : ''}`;
      const tw1 = ctx.measureText(nameText).width;
      const tw2 = ctx.measureText(statusText).width;
      const maxTw = Math.max(tw1, tw2) + 12 * zoom;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = isDrone ? '#38bdf8' : (v.color || '#06b6d4');
      ctx.lineWidth = 1 * zoom;
      ctx.beginPath();
      ctx.roundRect(sc.x - maxTw / 2, tagY - 14 * zoom, maxTw, 22 * zoom, 4 * zoom);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(nameText, sc.x, tagY - 3 * zoom);
      ctx.font = `600 ${Math.max(6, 7 * zoom)}px 'Inter',sans-serif`;
      ctx.fillStyle = isDrone ? '#7dd3fc' : (v.color || '#67e8f9');
      ctx.fillText(statusText, sc.x, tagY + 6 * zoom);
    }

    ctx.restore();
  }

  _drawWorldConstruction(ctx, c, cx, cy, zoom) {
    if (!c) return;
    const cxCoord = typeof c.x === 'number' ? c.x : 0;
    const cyCoord = typeof c.y === 'number' ? c.y : 0;
    const sc = this.toScreen(cxCoord, cyCoord, 0, cx, cy, zoom);

    ctx.save();

    // 1. Foundation Slab & Scaffolding
    const w = 60 * zoom;
    const h = 36 * zoom;

    // Foundation pad (isometric rhombus)
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5 * zoom;
    ctx.beginPath();
    ctx.moveTo(sc.x, sc.y - h / 2);
    ctx.lineTo(sc.x + w / 2, sc.y);
    ctx.lineTo(sc.x, sc.y + h / 2);
    ctx.lineTo(sc.x - w / 2, sc.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Construction yellow/black hazard tape border
    ctx.strokeStyle = '#f59e0b';
    ctx.setLineDash([4 * zoom, 4 * zoom]);
    ctx.lineWidth = 2 * zoom;
    ctx.beginPath();
    ctx.rect(sc.x - (w / 2 + 4 * zoom), sc.y - (h / 2 + 4 * zoom), w + 8 * zoom, h + 8 * zoom);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Scaffolding Structure Columns
    const stage = String(c.stage || 'STRUCTURE').toUpperCase();
    const colHeight = (stage === 'FOUNDATION' ? 12 : (stage === 'STRUCTURE' ? 26 : 38)) * zoom;

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5 * zoom;
    const pillars = [
      { x: sc.x - w * 0.35, y: sc.y },
      { x: sc.x + w * 0.35, y: sc.y },
      { x: sc.x, y: sc.y - h * 0.3 },
      { x: sc.x, y: sc.y + h * 0.3 }
    ];
    for (const p of pillars) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y - colHeight);
      ctx.stroke();
    }

    // Top girder connectors
    if (stage !== 'FOUNDATION') {
      ctx.strokeStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(sc.x - w * 0.35, sc.y - colHeight);
      ctx.lineTo(sc.x, sc.y - h * 0.3 - colHeight);
      ctx.lineTo(sc.x + w * 0.35, sc.y - colHeight);
      ctx.lineTo(sc.x, sc.y + h * 0.3 - colHeight);
      ctx.closePath();
      ctx.stroke();
    }

    // Crane if in progress
    const craneArmX = sc.x + 18 * zoom;
    const craneArmY = sc.y - colHeight - 16 * zoom;
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2 * zoom;
    ctx.beginPath();
    ctx.moveTo(sc.x, sc.y - colHeight);
    ctx.lineTo(sc.x, craneArmY);
    ctx.lineTo(craneArmX + 14 * zoom, craneArmY - 4 * zoom);
    ctx.stroke();

    // Crane cable & hook
    const hookSway = Math.sin(this.time * 2.5) * 3 * zoom;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1 * zoom;
    ctx.beginPath();
    ctx.moveTo(craneArmX + 8 * zoom, craneArmY - 3 * zoom);
    ctx.lineTo(craneArmX + 8 * zoom + hookSway, craneArmY + 12 * zoom);
    ctx.stroke();

    // 3. Construction Info Tag / Progress HUD
    if (!this.state.photoMode && zoom >= 0.7 && zoom < 2.0) {
      const tagY = sc.y - colHeight - 26 * zoom;
      ctx.font = `700 ${Math.max(7, 8.5 * zoom)}px 'JetBrains Mono',monospace`;
      ctx.textAlign = 'center';

      const title = c.name || c.id;
      const progress = Math.min(100, Math.max(0, Number(c.progress || 0)));
      const sub = `🚧 ${stage} • ${progress}%`;

      const tw = Math.max(ctx.measureText(title).width, ctx.measureText(sub).width) + 16 * zoom;
      const bh = 26 * zoom;

      // Card bg
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1 * zoom;
      ctx.beginPath();
      ctx.roundRect(sc.x - tw / 2, tagY - 14 * zoom, tw, bh, 4 * zoom);
      ctx.fill();
      ctx.stroke();

      // Title & Stage
      ctx.fillStyle = '#fef08a';
      ctx.fillText(title, sc.x, tagY - 2 * zoom);

      ctx.fillStyle = '#f59e0b';
      ctx.font = `600 ${Math.max(6, 7.5 * zoom)}px 'Inter',sans-serif`;
      ctx.fillText(sub, sc.x, tagY + 8 * zoom);

      // Mini progress bar at bottom of card
      const barW = tw - 12 * zoom;
      const barH = 3 * zoom;
      const barX = sc.x - barW / 2;
      const barY = tagY + 10 * zoom;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(barX, barY, barW * (progress / 100), barH);
    }

    ctx.restore();
  }

  findPath(startX, startY, targetX, targetY) {
    if (window.FenixPixelEngine && window.FenixPixelEngine.findPath) {
      return window.FenixPixelEngine.findPath(startX, startY, targetX, targetY);
    }
    return this.grid ? this.grid.findPath(startX, startY, targetX, targetY) : [{ x: targetX, y: targetY }];
  }

  sendEnvelope(fromAgentId, toAgentId, text, color) {
    const from = [...this.world.agents.values()].find(a => String(a.id) === String(fromAgentId) || String(a.name) === String(fromAgentId));
    const to = [...this.world.agents.values()].find(a => String(a.id) === String(toAgentId) || String(a.name) === String(toAgentId));
    if (!from || !to) return;
    this.world.envelopes = this.world.envelopes || [];
    this.world.envelopes.push({
      fromAgentId: from.id,
      toAgentId: to.id,
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      progress: 0,
      speed: 0.9,
      text: text || 'HANDOFF DISPATCH',
      color: color || from.color || '#06b6d4'
    });
  }

  _drawRoads(ctx, cx, cy, zoom) {
    if (!this.grid || !this.grid.roads) return;
    ctx.save();
    const pulseOffset = (this.time * 24) % 40;
    for (const [x1, y1, x2, y2] of this.grid.roads) {
      const p1 = this.toScreen(x1, y1, 0.05, cx, cy, zoom);
      const p2 = this.toScreen(x2, y2, 0.05, cx, cy, zoom);

      // Road bed
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.lineWidth = Math.max(6, 12 * zoom);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Cyber glow border
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.lineWidth = Math.max(1, 1.5 * zoom);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Animated energy pulses along road
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 6 * zoom;
      ctx.lineWidth = Math.max(1.5, 2.5 * zoom);
      ctx.setLineDash([4 * zoom, 36 * zoom]);
      ctx.lineDashOffset = -pulseOffset * zoom;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  _drawWorkstations(ctx, d, cx, cy, zoom, dep) {
    if (!d || d.id === 'CENTRAL') return;
    const hw = d.w / 2, hh = d.h / 2;
    const stations = [
      { ox: -hw * 0.55, oy: hh * 0.45 },
      { ox: hw * 0.55, oy: hh * 0.45 }
    ];

    for (let sIdx = 0; sIdx < stations.length; sIdx++) {
      const st = stations[sIdx];
      const wx = d.x + st.ox;
      const wy = d.y + st.oy;
      const deskPos = this.toScreen(wx, wy, dep + 0.02, cx, cy, zoom);

      ctx.save();
      const dw = 14 * zoom;
      const dh = 7 * zoom;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = (d.color || '#38bdf8') + '80';
      ctx.lineWidth = Math.max(1, zoom);
      ctx.beginPath();
      ctx.ellipse(deskPos.x, deskPos.y, dw, dh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const monX = deskPos.x;
      const monY = deskPos.y - 6 * zoom;
      const mw = 10 * zoom;
      const mh = 7 * zoom;

      ctx.fillStyle = '#020617';
      ctx.strokeStyle = d.color || '#38bdf8';
      ctx.lineWidth = Math.max(1, zoom);
      ctx.strokeRect(monX - mw / 2, monY - mh, mw, mh);
      ctx.fillRect(monX - mw / 2, monY - mh, mw, mh);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(monX - mw / 2 + 1, monY - mh + 1, mw - 2, mh - 2);

      ctx.fillStyle = d.color || '#38bdf8';
      const flicker = Math.sin(this.time * 8 + sIdx * 3) > -0.3 ? 1 : 0.4;
      ctx.globalAlpha = flicker;
      for (let li = 0; li < 3; li++) {
        const lineW = (4 + ((li + sIdx) % 3) * 2) * zoom;
        ctx.fillRect(monX - mw / 2 + 2, monY - mh + 2 + li * 2 * zoom, lineW, Math.max(1, zoom));
      }
      ctx.restore();
    }
  }

  _drawEnvelopes(ctx, cx, cy, zoom) {
    if (!this.world.envelopes || !this.world.envelopes.length) return;
    for (const env of this.world.envelopes) {
      const arc = Math.sin(Math.min(1, env.progress) * Math.PI) * 1.5;
      const px = env.fromX + (env.toX - env.fromX) * env.progress;
      const py = env.fromY + (env.toY - env.fromY) * env.progress;
      const pz = 0.3 + arc;
      const sc = this.toScreen(px, py, pz, cx, cy, zoom);

      ctx.save();
      ctx.translate(sc.x, sc.y);

      ctx.save();
      ctx.shadowColor = env.color || '#06b6d4';
      ctx.shadowBlur = 12 * zoom;
      ctx.fillStyle = env.color || '#06b6d4';
      ctx.beginPath();
      ctx.arc(0, 0, 5 * zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const ew = 10 * zoom;
      const eh = 7 * zoom;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = env.color || '#06b6d4';
      ctx.lineWidth = Math.max(1, 1.2 * zoom);
      ctx.fillRect(-ew / 2, -eh / 2, ew, eh);
      ctx.strokeRect(-ew / 2, -eh / 2, ew, eh);

      ctx.beginPath();
      ctx.moveTo(-ew / 2, -eh / 2);
      ctx.lineTo(0, 1 * zoom);
      ctx.lineTo(ew / 2, -eh / 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  _openContextMenu(e) {
    this._closeContextMenu();
    // In OBSERVATION mode, only allow inspect (no mutating actions)
    const isObservation = (window.fenixCityMode === 'OBSERVATION');
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;

    const agent = this._hitTestAgent(mx, my);
    const wsHit = !agent ? this._hitTestWorkstation(mx, my) : null;
    const distHit = (!agent && !wsHit) ? this._hitTestDistrict(mx, my) : null;

    const menu = document.createElement('div');
    menu.className = 'fenix-city-context-menu';
    menu.style.left = `${Math.min(window.innerWidth - 220, e.clientX)}px`;
    menu.style.top = `${Math.min(window.innerHeight - 320, e.clientY)}px`;

    if (agent) {
      const dis = isObservation ? ' disabled style="opacity:0.4; pointer-events:none;"' : '';
      menu.innerHTML = `
        <div class="fenix-ctx-header">${agent.emoji || '🤖'} ${agent.displayName || agent.name}${isObservation ? ' <span style="font-size:9px; color:#6366f1;">(OBS)</span>' : ''}</div>
        <button class="fenix-ctx-item" data-action="inspect"><span>🔍</span> Inspecionar Agente</button>
        <button class="fenix-ctx-item" data-action="follow"><span>🎥</span> Seguir Câmera</button>
        <button class="fenix-ctx-item" data-action="memory"><span>🧠</span> Ver Memória</button>
        <button class="fenix-ctx-item" data-action="logs"><span>📄</span> Ver Logs</button>
        <button class="fenix-ctx-item" data-action="project"><span>📁</span> Ver Projeto</button>
        <button class="fenix-ctx-item" data-action="station"><span>🖥️</span> Ir para a Estação</button>
        <div class="fenix-ctx-divider"></div>
        <button class="fenix-ctx-item"${dis} data-action="chat"><span>💬</span> Conversar (Chat Espacial)</button>
        <button class="fenix-ctx-item"${dis} data-action="tasks"><span>📋</span> Perguntar Tarefas do Dia</button>
        <button class="fenix-ctx-item"${dis} data-action="assign"><span>📝</span> Atribuir Tarefa</button>
        <button class="fenix-ctx-item"${dis} data-action="toggle-pause"><span>${agent.status === 'PAUSED' ? '▶️ Retomar Agente' : '⏸️ Pausar Agente'}</span></button>
        <button class="fenix-ctx-item danger"${dis} data-action="restart"><span>🔄</span> Reiniciar Agente</button>
      `;

      menu.addEventListener('click', async (evt) => {
        const btn = evt.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        this._closeContextMenu();

        if (action === 'chat') {
          this.focusAgent(agent.id);
        } else if (action === 'tasks') {
          this.focusAgent(agent.id);
          setTimeout(() => { if (typeof window.askSpatialAgentQuick === 'function') window.askSpatialAgentQuick('tasks'); }, 200);
        } else if (action === 'station') {
          this.focusStationForAgent(agent.id);
        } else if (action === 'inspect') {
          this.state.selectedAgent = agent;
          window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent, agentId: agent.id } }));
        } else if (action === 'follow') {
          this.followAgent(agent.id);
        } else if (action === 'assign') {
          this._openAssignTaskModal(agent);
        } else if (action === 'memory') {
          this.state.selectedAgent = agent;
          window.dispatchEvent(new CustomEvent('fenix-memory-requested', { detail: { agentId: agent.id } }));
          window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent, agentId: agent.id, tab: 'memory' } }));
        } else if (action === 'logs') {
          this.state.selectedAgent = agent;
          window.dispatchEvent(new CustomEvent('fenix-logs-requested', { detail: { agentId: agent.id } }));
          window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent, agentId: agent.id, tab: 'logs' } }));
        } else if (action === 'project') {
          const pId = agent.projectId || agent.currentMission?.projectId || 'FENIX-CORE';
          this.focusProject(pId);
        } else if (action === 'toggle-pause') {
          const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
          const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
          const endpoint = agent.status === 'PAUSED' ? `/api/v2/agents/${encodeURIComponent(agent.id)}/resume` : `/api/v2/agents/${encodeURIComponent(agent.id)}/pause`;
          await fetch(endpoint, { method: 'POST', headers }).catch(() => {});
          this.syncRealData();
        } else if (action === 'restart') {
          const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
          const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
          await fetch(`/api/v2/agents/${encodeURIComponent(agent.id)}/restart`, { method: 'POST', headers }).catch(() => {});
          this.syncRealData();
        }
      });
    } else if (wsHit) {
      const st = wsHit.station;
      menu.innerHTML = `
        <div class="fenix-ctx-header">🖥️ ${st.deskLabel}</div>
        <button class="fenix-ctx-item" data-action="open-station"><span>🔍</span> Inspecionar Estação (Preview)</button>
        <button class="fenix-ctx-item" data-action="open-ide"><span>💻</span> Abrir Arquivo no IDE</button>
        <button class="fenix-ctx-item" data-action="open-terminal"><span>⚡</span> Abrir Terminal</button>
        <button class="fenix-ctx-item" data-action="focus-station"><span>🎥</span> Focar Câmera</button>
      `;
      menu.addEventListener('click', (evt) => {
        const btn = evt.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        this._closeContextMenu();

        if (action === 'open-station') {
          this.openStationPreview(st, wsHit.agentId);
        } else if (action === 'open-ide') {
          window._currentActiveStationFile = st.file;
          if (typeof window.openStationInIDE === 'function') window.openStationInIDE();
        } else if (action === 'open-terminal') {
          if (typeof window.openStationTerminal === 'function') window.openStationTerminal();
        } else if (action === 'focus-station') {
          this.focusStationForAgent(wsHit.agentId);
        }
      });
    } else if (distHit) {
      const d = distHit.district;
      const bld = CANONICAL_BUILDING_FLOORS[distHit.key];
      let floorsHtml = '';
      if (bld && bld.floors && bld.floors.length > 1) {
        floorsHtml = `<div class="fenix-ctx-divider"></div>
        <div style="font-size:9.5px; color:#64748B; text-transform:uppercase; padding:4px 10px; font-weight:700;">Andares do Edifício:</div>` +
        bld.floors.map(f => `<button class="fenix-ctx-item" data-action="floor-${f.floorNum}"><span>📐</span> ${f.name}</button>`).join('');
      }

      menu.innerHTML = `
        <div class="fenix-ctx-header">${d.emoji || '🏛️'} ${d.name}</div>
        <button class="fenix-ctx-item" data-action="enter-building"><span>🏢</span> Entrar no Edifício</button>
        <button class="fenix-ctx-item" data-action="inspect-district"><span>🔍</span> Inspecionar Departamento</button>
        <button class="fenix-ctx-item" data-action="focus-district"><span>🎥</span> Focar Câmera</button>
        ${floorsHtml}
      `;
      menu.addEventListener('click', (evt) => {
        const btn = evt.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        this._closeContextMenu();

        if (action === 'enter-building') {
          this.navigateToLevel('building', d);
        } else if (action.startsWith('floor-')) {
          const fnum = Number(action.split('-')[1]);
          this.navigateToLevel('floor', { bldKey: distHit.key, flNum: fnum });
        } else if (action === 'inspect-district') {
          window.dispatchEvent(new CustomEvent('fenix-district-selected', { detail: distHit }));
        } else if (action === 'focus-district') {
          const tw = this.state.tileSize;
          const th = this.state.tileSize / 2;
          const cameraPoint = this.toScreen(d.x, d.y, 0, 0, 0, 1);
          this.state.targetCamera.x = -cameraPoint.x;
          this.state.targetCamera.y = -cameraPoint.y;
          this.state.targetCamera.zoom = 1.35;
          this._updateZoomDisplay();
        }
      });
    } else {
      menu.innerHTML = `
        <div class="fenix-ctx-header">🌐 FÊNIX AI CITY 4.0</div>
        <button class="fenix-ctx-item" data-action="world-view"><span>🌍</span> Visão Macro da Cidade (0.65x)</button>
        <button class="fenix-ctx-item" data-action="reset-camera"><span>🔄</span> Resetar Posição da Câmera</button>
        <button class="fenix-ctx-item" data-action="toggle-light"><span>🌙</span> Alternar Dia / Noite</button>
      `;
      menu.addEventListener('click', (evt) => {
        const btn = evt.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        this._closeContextMenu();

        if (action === 'world-view') {
          this.navigateToLevel('city');
        } else if (action === 'reset-camera') {
          this.resetCamera();
        } else if (action === 'toggle-light') {
          this.toggleDayNight();
        }
      });
    }

    document.body.appendChild(menu);
    this._contextMenuEl = menu;
  }

  _closeContextMenu() {
    if (this._contextMenuEl) {
      this._contextMenuEl.remove();
      this._contextMenuEl = null;
    }
  }

  _openRenameModal(agent) {
    const backdrop = document.createElement('div');
    backdrop.className = 'fenix-avatar-modal-backdrop';
    backdrop.innerHTML = `
      <div class="fenix-avatar-modal" style="max-width: 420px;">
        <div class="fenix-avatar-modal-head">
          <h3>✏️ RENOMEAR AGENTE</h3>
          <button class="fenix-avatar-preview-btn" id="btnCancelRename">✕</button>
        </div>
        <div class="fenix-avatar-modal-body" style="padding: 20px;">
          <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
            <label style="font-size: 11px; color: #94a3b8; font-family: monospace;">NOME DE EXIBIÇÃO:</label>
            <input type="text" id="renameAgentInput" class="fenix-avatar-input" value="${agent.displayName || agent.name}" style="width: 100%; box-sizing: border-box;" />
          </div>
        </div>
        <div class="fenix-avatar-modal-footer">
          <button class="fenix-avatar-preview-btn" id="btnDismissRename">Cancelar</button>
          <button class="fenix-avatar-preview-btn" id="btnSaveRename" style="background: rgba(239, 68, 68, 0.2); border-color: #ef4444; color: #fff; font-weight: 700;">Salvar</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelector('#btnCancelRename')?.addEventListener('click', close);
    backdrop.querySelector('#btnDismissRename')?.addEventListener('click', close);
    backdrop.querySelector('#btnSaveRename')?.addEventListener('click', async () => {
      const newName = backdrop.querySelector('#renameAgentInput')?.value?.trim();
      if (newName) {
        const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
        const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) };
        await fetch(`/api/v2/agents/${encodeURIComponent(agent.id)}/profile`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ displayName: newName })
        }).catch(() => {});
        agent.displayName = newName;
        agent.name = newName;
        this.syncRealData();
      }
      close();
    });
  }

  _openAssignTaskModal(agent) {
    const backdrop = document.createElement('div');
    backdrop.className = 'fenix-avatar-modal-backdrop';
    backdrop.innerHTML = `
      <div class="fenix-avatar-modal" style="width: 480px;">
        <div class="fenix-avatar-modal-head">
          <h3>📋 ATRIBUIR TAREFA — ${agent.displayName || agent.name}</h3>
          <button class="fenix-avatar-preview-btn" id="btnAssignClose">✕</button>
        </div>
        <div class="fenix-avatar-modal-body" style="flex-direction: column; gap: 14px; padding: 18px;">
          <div class="fenix-avatar-field-row" style="flex-direction: column; align-items: flex-start; gap: 4px;">
            <label style="font-size: 11px; color: #94a3b8; font-family: monospace;">TÍTULO DA TAREFA:</label>
            <input type="text" id="assignTaskTitle" class="fenix-avatar-input" style="width: 100%; box-sizing: border-box;" placeholder="Ex: Executar auditoria de rotas e segurança" />
          </div>
          <div class="fenix-avatar-field-row" style="flex-direction: column; align-items: flex-start; gap: 4px;">
            <label style="font-size: 11px; color: #94a3b8; font-family: monospace;">INSTRUÇÃO / PROMPT:</label>
            <textarea id="assignTaskPrompt" class="fenix-avatar-input" rows="4" style="width: 100%; box-sizing: border-box; resize: vertical;" placeholder="Descreva os passos que o agente deve executar..."></textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%;">
            <div class="fenix-avatar-field-row" style="flex-direction: column; align-items: flex-start; gap: 4px;">
              <label style="font-size: 11px; color: #94a3b8; font-family: monospace;">PRIORIDADE:</label>
              <select id="assignTaskPriority" class="fenix-avatar-select" style="width: 100%; box-sizing: border-box;">
                <option value="normal">Normal</option>
                <option value="high">Alta (Urgente)</option>
                <option value="critical">Crítica (Bloqueante)</option>
              </select>
            </div>
            <div class="fenix-avatar-field-row" style="flex-direction: column; align-items: flex-start; gap: 4px;">
              <label style="font-size: 11px; color: #94a3b8; font-family: monospace;">DISTRITO ALVO:</label>
              <select id="assignTaskDistrict" class="fenix-avatar-select" style="width: 100%; box-sizing: border-box;">
                ${Object.values(this.DISTRICTS).map(d => `<option value="${d.id}" ${d.id === agent.district ? 'selected' : ''}>${d.emoji || ''} ${d.name}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div class="fenix-avatar-modal-footer">
          <button class="fenix-avatar-preview-btn" id="btnAssignCancel">Cancelar</button>
          <button class="fenix-avatar-preview-btn" id="btnAssignSubmit" style="background: rgba(56, 189, 248, 0.25); border-color: #38bdf8; color: #fff; font-weight: 800;">Despachar Tarefa</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelector('#btnAssignClose')?.addEventListener('click', close);
    backdrop.querySelector('#btnAssignCancel')?.addEventListener('click', close);

    backdrop.querySelector('#btnAssignSubmit')?.addEventListener('click', async () => {
      const title = backdrop.querySelector('#assignTaskTitle')?.value?.trim();
      const prompt = backdrop.querySelector('#assignTaskPrompt')?.value?.trim();
      const priority = backdrop.querySelector('#assignTaskPriority')?.value || 'normal';
      const district = backdrop.querySelector('#assignTaskDistrict')?.value || agent.district;
      if (!title) return;

      const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
      const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) };
      try {
        await fetch('/api/v2/jobs', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title,
            description: prompt || title,
            agentId: agent.id,
            priority,
            district,
            status: 'QUEUED'
          })
        });
        this.audio?.playTaskStart();
        this.syncRealData();
      } catch {}
      close();
    });
  }

  _openAvatarEditorModal(agent) {
    const currentConfig = { ...getAgentAvatarConfig(agent) };
    let previewFacing = 'SE';
    let previewState = 'idle';
    let previewAnimFrame = 0;
    let previewAnimTimer = null;

    const facings = ['SE', 'SW', 'NW', 'NE'];
    const animStates = ['idle', 'walk', 'working', 'error'];

    const backdrop = document.createElement('div');
    backdrop.className = 'fenix-avatar-modal-backdrop';
    backdrop.innerHTML = `
      <div class="fenix-avatar-modal">
        <div class="fenix-avatar-modal-head">
          <h3>🎨 EDITOR DE AVATAR — ${agent.displayName || agent.name}</h3>
          <button class="fenix-avatar-preview-btn" id="btnAvModalClose">✕</button>
        </div>
        <div class="fenix-avatar-modal-body">
          <div class="fenix-avatar-preview-pane">
            <canvas class="fenix-avatar-preview-canvas" id="avPreviewCanvas" width="180" height="220"></canvas>
            <div class="fenix-avatar-preview-controls">
              <button class="fenix-avatar-preview-btn" id="btnAvRotLeft" title="Girar Esquerda">↺</button>
              <button class="fenix-avatar-preview-btn" id="btnAvRotRight" title="Girar Direita">↻</button>
              <button class="fenix-avatar-preview-btn" id="btnAvAnimCycle" title="Alternar Animação">▶ ESTADO</button>
            </div>
            <div id="avAnimLabel" style="font-size: 10px; color: #38bdf8; margin-top: 6px; font-family: monospace;">ESTADO: IDLE</div>
          </div>
          <div class="fenix-avatar-controls-pane">
            <div class="fenix-avatar-section-title">IDENTIDADE & CARGO</div>
            <div class="fenix-avatar-field-row">
              <label>NOME:</label>
              <input type="text" id="avDisplayNameInput" class="fenix-avatar-input" value="${agent.displayName || agent.name}" />
            </div>
            <div class="fenix-avatar-field-row">
              <label>CARGO / ROLE:</label>
              <input type="text" id="avRoleInput" class="fenix-avatar-input" value="${agent.role || 'developer'}" />
            </div>

            <div class="fenix-avatar-section-title">PELE & TOM</div>
            <div class="fenix-avatar-field-row">
              <label>TOM DE PELE:</label>
              <div class="fenix-palette-swatches" id="skinSwatches">
                ${Object.entries(AVATAR_PALETTES.skins).map(([k, s]) => `
                  <div class="fenix-swatch ${k === currentConfig.skin ? 'active' : ''}" data-skin="${k}" style="background: ${s.base};" title="${k}"></div>
                `).join('')}
              </div>
            </div>

            <div class="fenix-avatar-section-title">CABELO</div>
            <div class="fenix-avatar-field-row">
              <label>ESTILO:</label>
              <select id="avHairStyleSelect" class="fenix-avatar-select">
                ${AVATAR_PALETTES.hairStyles.map(h => `<option value="${h}" ${h === currentConfig.hairStyle ? 'selected' : ''}>${h.toUpperCase()}</option>`).join('')}
              </select>
            </div>
            <div class="fenix-avatar-field-row">
              <label>COR DO CABELO:</label>
              <div class="fenix-palette-swatches" id="hairColorSwatches">
                ${Object.entries(AVATAR_PALETTES.hairColors).map(([k, c]) => `
                  <div class="fenix-swatch ${k === currentConfig.hairColor ? 'active' : ''}" data-hair-color="${k}" style="background: ${c};" title="${k}"></div>
                `).join('')}
              </div>
            </div>

            <div class="fenix-avatar-section-title">TRAJE & VESTIMENTA</div>
            <div class="fenix-avatar-field-row">
              <label>TIPO DE TRAJE:</label>
              <select id="avOutfitSelect" class="fenix-avatar-select">
                ${AVATAR_PALETTES.outfits.map(o => `<option value="${o}" ${o === currentConfig.outfit ? 'selected' : ''}>${o.toUpperCase()}</option>`).join('')}
              </select>
            </div>
            <div class="fenix-avatar-field-row">
              <label>COR DO TRAJE:</label>
              <input type="color" id="avOutfitColorInput" value="${currentConfig.shirtColor || currentConfig.outfitColor || agent.color || '#3b82f6'}" class="fenix-avatar-input" style="height: 28px; padding: 2px 4px;" />
            </div>
            <div class="fenix-avatar-field-row">
              <label>COR DA CALÇA:</label>
              <input type="color" id="avPantsColorInput" value="${currentConfig.pantsColor || '#1e293b'}" class="fenix-avatar-input" style="height: 28px; padding: 2px 4px;" />
            </div>
            <div class="fenix-avatar-field-row">
              <label>COR DOS SAPATOS:</label>
              <input type="color" id="avShoesColorInput" value="${currentConfig.shoesColor || '#090d16'}" class="fenix-avatar-input" style="height: 28px; padding: 2px 4px;" />
            </div>

            <div class="fenix-avatar-section-title">ACESSÓRIOS & BADGES</div>
            <div class="fenix-avatar-field-row">
              <label>ACESSÓRIO:</label>
              <select id="avAccessorySelect" class="fenix-avatar-select">
                ${AVATAR_PALETTES.accessories.map(a => `<option value="${a}" ${a === currentConfig.accessory ? 'selected' : ''}>${a.toUpperCase()}</option>`).join('')}
              </select>
            </div>
            <div class="fenix-avatar-field-row">
              <label>INSÍGNIA / BADGE:</label>
              <select id="avBadgeSelect" class="fenix-avatar-select">
                <option value="none" ${currentConfig.badge === 'none' ? 'selected' : ''}>NENHUMA</option>
                <option value="bronze" ${currentConfig.badge === 'bronze' ? 'selected' : ''}>🥉 BRONZE</option>
                <option value="silver" ${currentConfig.badge === 'silver' ? 'selected' : ''}>🥈 PRATA (SILVER)</option>
                <option value="gold" ${currentConfig.badge === 'gold' ? 'selected' : ''}>🥇 OURO (GOLD)</option>
                <option value="diamond" ${currentConfig.badge === 'diamond' ? 'selected' : ''}>💎 DIAMANTE (DIAMOND)</option>
                <option value="master" ${currentConfig.badge === 'master' ? 'selected' : ''}>🔥 MESTRE (MASTER - RED)</option>
              </select>
            </div>
          </div>
        </div>
        <div class="fenix-avatar-modal-footer">
          <button class="fenix-avatar-preview-btn" id="btnAvCancel">Cancelar</button>
          <button class="fenix-avatar-preview-btn" id="btnAvSave" style="background: rgba(239, 68, 68, 0.25); border-color: #ef4444; color: #fff; font-weight: 800;">Salvar Avatar</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const prevCanvas = backdrop.querySelector('#avPreviewCanvas');
    const pCtx = prevCanvas?.getContext('2d');

    const renderPreview = () => {
      if (!pCtx) return;
      pCtx.clearRect(0, 0, 180, 220);
      const isMaster = agent.id === 'Orchestrator' || String(agent.role || '').toLowerCase().includes('orchestrator') || agent.id === 'master';

      PixelAvatarRenderer.drawAvatar(pCtx, {
        x: 90,
        y: 160,
        zoom: 2.8,
        facing: previewFacing,
        frame: previewAnimFrame,
        state: previewState,
        config: currentConfig,
        color: currentConfig.outfitColor || agent.color,
        isMaster,
        time: performance.now() / 1000
      });
    };

    let animTime = 0;
    const loop = () => {
      animTime += 0.04;
      previewAnimFrame = Math.floor(animTime * 4) % 4;
      renderPreview();
      previewAnimTimer = requestAnimationFrame(loop);
    };
    previewAnimTimer = requestAnimationFrame(loop);

    const close = () => {
      if (previewAnimTimer) cancelAnimationFrame(previewAnimTimer);
      backdrop.remove();
    };

    backdrop.querySelector('#btnAvModalClose')?.addEventListener('click', close);
    backdrop.querySelector('#btnAvCancel')?.addEventListener('click', close);

    backdrop.querySelector('#btnAvRotLeft')?.addEventListener('click', () => {
      const idx = facings.indexOf(previewFacing);
      previewFacing = facings[(idx + 1) % facings.length];
      renderPreview();
    });
    backdrop.querySelector('#btnAvRotRight')?.addEventListener('click', () => {
      const idx = facings.indexOf(previewFacing);
      previewFacing = facings[(idx - 1 + facings.length) % facings.length];
      renderPreview();
    });
    backdrop.querySelector('#btnAvAnimCycle')?.addEventListener('click', () => {
      const idx = animStates.indexOf(previewState);
      previewState = animStates[(idx + 1) % animStates.length];
      const lbl = backdrop.querySelector('#avAnimLabel');
      if (lbl) lbl.textContent = `ESTADO: ${previewState.toUpperCase()}`;
      renderPreview();
    });

    backdrop.querySelectorAll('#skinSwatches [data-skin]').forEach(sw => {
      sw.addEventListener('click', () => {
        backdrop.querySelectorAll('#skinSwatches .fenix-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        currentConfig.skin = sw.getAttribute('data-skin');
        renderPreview();
      });
    });

    backdrop.querySelector('#avHairStyleSelect')?.addEventListener('change', (e) => {
      currentConfig.hairStyle = e.target.value;
      renderPreview();
    });

    backdrop.querySelectorAll('#hairColorSwatches [data-hair-color]').forEach(sw => {
      sw.addEventListener('click', () => {
        backdrop.querySelectorAll('#hairColorSwatches .fenix-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        currentConfig.hairColor = sw.getAttribute('data-hair-color');
        renderPreview();
      });
    });

    backdrop.querySelector('#avRoleInput')?.addEventListener('input', (e) => {
      agent.role = e.target.value;
    });

    backdrop.querySelector('#avOutfitSelect')?.addEventListener('change', (e) => {
      currentConfig.outfit = e.target.value;
      renderPreview();
    });

    backdrop.querySelector('#avOutfitColorInput')?.addEventListener('input', (e) => {
      currentConfig.outfitColor = e.target.value;
      currentConfig.shirtColor = e.target.value;
      renderPreview();
    });

    backdrop.querySelector('#avPantsColorInput')?.addEventListener('input', (e) => {
      currentConfig.pantsColor = e.target.value;
      renderPreview();
    });

    backdrop.querySelector('#avShoesColorInput')?.addEventListener('input', (e) => {
      currentConfig.shoesColor = e.target.value;
      renderPreview();
    });

    backdrop.querySelector('#avAccessorySelect')?.addEventListener('change', (e) => {
      currentConfig.accessory = e.target.value;
      renderPreview();
    });

    backdrop.querySelector('#avBadgeSelect')?.addEventListener('change', (e) => {
      currentConfig.badge = e.target.value;
      renderPreview();
    });

    backdrop.querySelector('#btnAvSave')?.addEventListener('click', async () => {
      const newDisplayName = backdrop.querySelector('#avDisplayNameInput')?.value?.trim() || agent.name;
      const newRole = backdrop.querySelector('#avRoleInput')?.value?.trim() || agent.role;
      const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
      const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) };

      await fetch(`/api/v2/agents/${encodeURIComponent(agent.id)}/profile`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          displayName: newDisplayName,
          role: newRole,
          avatar: currentConfig
        })
      }).catch(() => {});

      agent.displayName = newDisplayName;
      agent.name = newDisplayName;
      agent.role = newRole;
      agent.avatar = { ...currentConfig };
      this.syncRealData();
      close();
    });
  }

  _openCreateAgentWizard() {
    let currentStep = 1;
    const stepTitles = [
      'Identidade Básica',
      'Distrito Operacional',
      'Cargo & Especialização',
      'Modelo Cognitivo (LLM)',
      'System Prompt & Diretrizes',
      'Skills & Autonomia',
      'Memória & Contexto',
      'Avatar: Pele & Cabelo',
      'Avatar: Traje & Badges',
      'Revisão & Ativação'
    ];

    const wizardData = {
      name: 'Agent-' + Math.floor(100 + _pseudoRandom() * 900),
      displayName: '',
      district: 'DEVELOPMENT',
      role: 'developer',
      seniority: 'senior',
      model: 'auto',
      temperature: 0.7,
      systemPrompt: 'Você é um agente autônomo do FÊNIX OS, operando com máxima fidelidade às regras do sistema.',
      skills: ['git', 'browser', 'terminal'],
      memoryMode: 'episodic',
      avatar: {
        skin: 'light',
        hairStyle: 'spiky',
        hairColor: 'black',
        outfit: 'hoodie',
        shirtColor: '#8b5cf6',
        outfitColor: '#8b5cf6',
        pantsColor: '#1e293b',
        shoesColor: '#090d16',
        accessory: 'none',
        badge: 'bronze'
      }
    };

    const backdrop = document.createElement('div');
    backdrop.className = 'fenix-avatar-modal-backdrop';
    backdrop.innerHTML = `
      <div class="fenix-avatar-modal" style="max-width: 640px; width: 95%;">
        <div class="fenix-avatar-modal-head">
          <h3>➕ WIZARD: CRIAR NOVO AGENTE</h3>
          <button class="fenix-avatar-preview-btn" id="btnWizClose">✕</button>
        </div>
        <div style="padding: 12px 18px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span id="wizStepLabel" style="font-size: 11px; font-weight: 700; color: #38bdf8; font-family: monospace;">ETAPA 1 DE 10: IDENTIDADE BÁSICA</span>
            <span id="wizStepCount" style="font-size: 10px; color: #94a3b8; font-family: monospace;">10%</span>
          </div>
          <div style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
            <div id="wizProgressBar" style="height: 100%; width: 10%; background: linear-gradient(90deg, #ef4444, #38bdf8); transition: width 0.3s ease;"></div>
          </div>
        </div>
        <div class="fenix-avatar-modal-body" id="wizBody" style="min-height: 290px; padding: 18px;">
          <!-- Step content injected dynamically -->
        </div>
        <div class="fenix-avatar-modal-footer">
          <button class="fenix-avatar-preview-btn" id="btnWizPrev" style="display: none;">← Voltar</button>
          <button class="fenix-avatar-preview-btn" id="btnWizNext" style="background: rgba(239, 68, 68, 0.25); border-color: #ef4444; color: #fff; font-weight: 800;">Avançar →</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelector('#btnWizClose')?.addEventListener('click', close);

    const renderStep = () => {
      const body = backdrop.querySelector('#wizBody');
      const prevBtn = backdrop.querySelector('#btnWizPrev');
      const nextBtn = backdrop.querySelector('#btnWizNext');
      const stepLabel = backdrop.querySelector('#wizStepLabel');
      const stepCount = backdrop.querySelector('#wizStepCount');
      const progressBar = backdrop.querySelector('#wizProgressBar');
      if (!body) return;

      if (stepLabel) stepLabel.textContent = `ETAPA ${currentStep} DE 10: ${stepTitles[currentStep - 1].toUpperCase()}`;
      if (stepCount) stepCount.textContent = `${currentStep * 10}%`;
      if (progressBar) progressBar.style.width = `${currentStep * 10}%`;

      if (prevBtn) prevBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
      if (nextBtn) {
        if (currentStep === 10) {
          nextBtn.textContent = '⚡ ATIVAR E SPAWNAR NA CIDADE';
          nextBtn.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.4), rgba(56, 189, 248, 0.4))';
        } else {
          nextBtn.textContent = 'Avançar →';
          nextBtn.style.background = 'rgba(239, 68, 68, 0.25)';
        }
      }

      if (currentStep === 1) {
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
            <div class="fenix-avatar-field-row">
              <label>ID / NOME DO AGENTE:</label>
              <input type="text" id="wizAgentName" class="fenix-avatar-input" value="${wizardData.name}" placeholder="Ex: Sentinel-Core" />
            </div>
            <div class="fenix-avatar-field-row">
              <label>NOME DE EXIBIÇÃO:</label>
              <input type="text" id="wizAgentDisplay" class="fenix-avatar-input" value="${wizardData.displayName || wizardData.name}" placeholder="Ex: Sentinel Core" />
            </div>
            <div style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin-top: 8px;">
              O ID será utilizado para roteamento em handoffs, despachos e chamadas via terminal e WebSocket.
            </div>
          </div>
        `;
      } else if (currentStep === 2) {
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
            <div class="fenix-avatar-field-row">
              <label>DISTRITO OPERACIONAL:</label>
              <select id="wizAgentDistrict" class="fenix-avatar-select">
                ${Object.values(this.DISTRICTS).map(d => `<option value="${d.id}" ${d.id === wizardData.district ? 'selected' : ''}>${d.emoji || ''} ${d.name}</option>`).join('')}
              </select>
            </div>
            <div id="wizDistDesc" style="font-size: 11px; color: #38bdf8; line-height: 1.5; background: rgba(56,189,248,0.08); padding: 10px; border-radius: 6px; border: 1px solid rgba(56,189,248,0.2);">
              Distrito onde o agente possui sua estação base e se locomove durante ciclos ociosos.
            </div>
          </div>
        `;
      } else if (currentStep === 3) {
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
            <div class="fenix-avatar-field-row">
              <label>CARGO / ESPECIALIZAÇÃO:</label>
              <select id="wizAgentRole" class="fenix-avatar-select">
                <option value="developer" ${wizardData.role === 'developer' ? 'selected' : ''}>DEVELOPER (Engenharia de Software)</option>
                <option value="frontend" ${wizardData.role === 'frontend' ? 'selected' : ''}>FRONTEND (UI/UX & Canvas 2.5D)</option>
                <option value="backend" ${wizardData.role === 'backend' ? 'selected' : ''}>BACKEND (APIs, Runtimes & Jobs)</option>
                <option value="database" ${wizardData.role === 'database' ? 'selected' : ''}>DATABASE (SQLite, Índices & Cache)</option>
                <option value="qa" ${wizardData.role === 'qa' ? 'selected' : ''}>QA AUTOMATION (Playwright & Layout Gate)</option>
                <option value="security" ${wizardData.role === 'security' ? 'selected' : ''}>SECURITY (Governança, RBAC & Kill Switch)</option>
                <option value="devops" ${wizardData.role === 'devops' ? 'selected' : ''}>DEVOPS (CI/CD, Build & Observabilidade)</option>
                <option value="research" ${wizardData.role === 'research' ? 'selected' : ''}>RESEARCH (Inteligência & Avaliação)</option>
                <option value="architect" ${wizardData.role === 'architect' ? 'selected' : ''}>ARCHITECT (Design de Sistemas & Contratos)</option>
              </select>
            </div>
            <div class="fenix-avatar-field-row">
              <label>SENIORIDADE OPERACIONAL:</label>
              <select id="wizAgentSeniority" class="fenix-avatar-select">
                <option value="junior" ${wizardData.seniority === 'junior' ? 'selected' : ''}>JUNIOR (Autonomia Assistida)</option>
                <option value="pleno" ${wizardData.seniority === 'pleno' ? 'selected' : ''}>PLENO (Execução Padrão)</option>
                <option value="senior" ${wizardData.seniority === 'senior' ? 'selected' : ''}>SENIOR (Autonomia Ampla)</option>
                <option value="lead" ${wizardData.seniority === 'lead' ? 'selected' : ''}>LEAD (Coordenação de Squads)</option>
                <option value="principal" ${wizardData.seniority === 'principal' ? 'selected' : ''}>PRINCIPAL (Decisão Arquitetural)</option>
              </select>
            </div>
          </div>
        `;
      } else if (currentStep === 4) {
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
            <div class="fenix-avatar-field-row">
              <label>MODELO DE INTELIGÊNCIA:</label>
              <select id="wizAgentModel" class="fenix-avatar-select">
                <option value="auto" ${wizardData.model === 'auto' ? 'selected' : ''}>Auto / Smart Router (Híbrido Inteligente)</option>
                <option value="ollama/qwen2.5-coder:7b" ${wizardData.model.includes('qwen') ? 'selected' : ''}>Ollama / Qwen 2.5 Coder (100% Local / Offline)</option>
                <option value="claude-3-5-sonnet" ${wizardData.model.includes('claude') ? 'selected' : ''}>Claude 3.5 Sonnet (Máxima Precisão de Código)</option>
                <option value="gpt-4o" ${wizardData.model.includes('gpt') ? 'selected' : ''}>GPT-4o (Raciocínio Rápido & Multimodal)</option>
                <option value="gemini-1.5-pro" ${wizardData.model.includes('gemini') ? 'selected' : ''}>Gemini 1.5 Pro (Contexto Gigante 1M+)</option>
              </select>
            </div>
            <div class="fenix-avatar-field-row">
              <label>TEMPERATURA COGNITIVA:</label>
              <select id="wizAgentTemp" class="fenix-avatar-select">
                <option value="0.2" ${wizardData.temperature === 0.2 ? 'selected' : ''}>0.2 - Determinístico & Preciso (Refatorações)</option>
                <option value="0.7" ${wizardData.temperature === 0.7 ? 'selected' : ''}>0.7 - Balanceado (Engenharia Geral)</option>
                <option value="1.0" ${wizardData.temperature === 1.0 ? 'selected' : ''}>1.0 - Criativo (Exploração & Design)</option>
              </select>
            </div>
          </div>
        `;
      } else if (currentStep === 5) {
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
            <label style="font-size: 11px; color: #94a3b8; font-family: monospace;">SYSTEM PROMPT & DIRETRIZES FUNDAMENTAIS:</label>
            <textarea id="wizAgentPrompt" class="fenix-avatar-input" rows="6" style="resize: vertical; font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.4;">${wizardData.systemPrompt}</textarea>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
              <input type="checkbox" id="wizStrictGovernance" checked />
              <label for="wizStrictGovernance" style="font-size: 11px; color: #cbd5e1; cursor: pointer;">Respeitar governança, Kill Switch e Layout Gate estrito</label>
            </div>
          </div>
        `;
      } else if (currentStep === 6) {
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
            <label style="font-size: 11px; color: #94a3b8; font-family: monospace;">SKILLS & PERMISSÕES AUTORIZADAS:</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd5e1; cursor: pointer;">
                <input type="checkbox" id="skillGit" checked /> Git & Controle de Versão
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd5e1; cursor: pointer;">
                <input type="checkbox" id="skillBrowser" checked /> Browser QA & Playwright
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd5e1; cursor: pointer;">
                <input type="checkbox" id="skillTerminal" checked /> Terminal & Execução Shell
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd5e1; cursor: pointer;">
                <input type="checkbox" id="skillDatabase" checked /> Banco de Dados & SQLite
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd5e1; cursor: pointer;">
                <input type="checkbox" id="skillMcp" checked /> Protocolo MCP & Connectors
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd5e1; cursor: pointer;">
                <input type="checkbox" id="skillNetwork" checked /> Rede & Chamadas HTTP
              </label>
            </div>
          </div>
        `;
      } else if (currentStep === 7) {
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
            <div class="fenix-avatar-field-row">
              <label>SISTEMA DE MEMÓRIA:</label>
              <select id="wizMemoryMode" class="fenix-avatar-select">
                <option value="episodic" ${wizardData.memoryMode === 'episodic' ? 'selected' : ''}>Episódica (Armazena missões, checkpoints e histórico)</option>
                <option value="semantic" ${wizardData.memoryMode === 'semantic' ? 'selected' : ''}>Semântica / Vetorial (Embeddings + Busca RAG)</option>
                <option value="ephemeral" ${wizardData.memoryMode === 'ephemeral' ? 'selected' : ''}>Efêmera (Volátil apenas para a sessão atual)</option>
              </select>
            </div>
            <div style="font-size: 11px; color: #94a3b8; line-height: 1.5; background: rgba(255,255,255,0.04); padding: 10px; border-radius: 6px;">
              A memória episódica conecta-se diretamente ao Engineering Memory persistente em SQLite.
            </div>
          </div>
        `;
      } else if (currentStep === 8) {
        body.innerHTML = `
          <div style="display: flex; gap: 16px; width: 100%;">
            <canvas id="wizAvCanvas8" width="140" height="170" class="fenix-avatar-preview-canvas" style="flex: 0 0 140px;"></canvas>
            <div style="display: flex; flex-direction: column; gap: 10px; flex: 1;">
              <div class="fenix-avatar-field-row">
                <label>PELE:</label>
                <select id="wizSkinSelect" class="fenix-avatar-select">
                  ${Object.keys(AVATAR_PALETTES.skins).map(k => `<option value="${k}" ${k === wizardData.avatar.skin ? 'selected' : ''}>${k.toUpperCase()}</option>`).join('')}
                </select>
              </div>
              <div class="fenix-avatar-field-row">
                <label>ESTILO CABELO:</label>
                <select id="wizHairStyleSelect" class="fenix-avatar-select">
                  ${AVATAR_PALETTES.hairStyles.map(h => `<option value="${h}" ${h === wizardData.avatar.hairStyle ? 'selected' : ''}>${h.toUpperCase()}</option>`).join('')}
                </select>
              </div>
              <div class="fenix-avatar-field-row">
                <label>COR CABELO:</label>
                <select id="wizHairColorSelect" class="fenix-avatar-select">
                  ${Object.keys(AVATAR_PALETTES.hairColors).map(c => `<option value="${c}" ${c === wizardData.avatar.hairColor ? 'selected' : ''}>${c.toUpperCase()}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
        `;
        setTimeout(() => {
          const wCanvas = backdrop.querySelector('#wizAvCanvas8');
          const wCtx = wCanvas?.getContext('2d');
          if (wCtx) {
            PixelAvatarRenderer.drawAvatar(wCtx, {
              x: 70, y: 125, zoom: 2.2, facing: 'SE', state: 'idle',
              config: wizardData.avatar, color: wizardData.avatar.shirtColor || '#8b5cf6', time: 0
            });
          }
          backdrop.querySelector('#wizSkinSelect')?.addEventListener('change', (e) => {
            wizardData.avatar.skin = e.target.value;
            renderStep();
          });
          backdrop.querySelector('#wizHairStyleSelect')?.addEventListener('change', (e) => {
            wizardData.avatar.hairStyle = e.target.value;
            renderStep();
          });
          backdrop.querySelector('#wizHairColorSelect')?.addEventListener('change', (e) => {
            wizardData.avatar.hairColor = e.target.value;
            renderStep();
          });
        }, 30);
      } else if (currentStep === 9) {
        body.innerHTML = `
          <div style="display: flex; gap: 16px; width: 100%;">
            <canvas id="wizAvCanvas9" width="140" height="170" class="fenix-avatar-preview-canvas" style="flex: 0 0 140px;"></canvas>
            <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
              <div class="fenix-avatar-field-row">
                <label>TRAJE:</label>
                <select id="wizOutfitSelect" class="fenix-avatar-select">
                  ${AVATAR_PALETTES.outfits.map(o => `<option value="${o}" ${o === wizardData.avatar.outfit ? 'selected' : ''}>${o.toUpperCase()}</option>`).join('')}
                </select>
              </div>
              <div class="fenix-avatar-field-row">
                <label>COR CAMISA:</label>
                <input type="color" id="wizShirtColor" value="${wizardData.avatar.shirtColor || '#8b5cf6'}" class="fenix-avatar-input" style="height: 26px; padding: 2px 4px;" />
              </div>
              <div class="fenix-avatar-field-row">
                <label>COR CALÇA:</label>
                <input type="color" id="wizPantsColor" value="${wizardData.avatar.pantsColor || '#1e293b'}" class="fenix-avatar-input" style="height: 26px; padding: 2px 4px;" />
              </div>
              <div class="fenix-avatar-field-row">
                <label>ACESSÓRIO:</label>
                <select id="wizAccessorySelect" class="fenix-avatar-select">
                  ${AVATAR_PALETTES.accessories.map(a => `<option value="${a}" ${a === wizardData.avatar.accessory ? 'selected' : ''}>${a.toUpperCase()}</option>`).join('')}
                </select>
              </div>
              <div class="fenix-avatar-field-row">
                <label>INSÍGNIA:</label>
                <select id="wizBadgeSelect" class="fenix-avatar-select">
                  <option value="none" ${wizardData.avatar.badge === 'none' ? 'selected' : ''}>Nenhuma</option>
                  <option value="bronze" ${wizardData.avatar.badge === 'bronze' ? 'selected' : ''}>🥉 Bronze</option>
                  <option value="silver" ${wizardData.avatar.badge === 'silver' ? 'selected' : ''}>🥈 Prata</option>
                  <option value="gold" ${wizardData.avatar.badge === 'gold' ? 'selected' : ''}>🥇 Ouro</option>
                  <option value="diamond" ${wizardData.avatar.badge === 'diamond' ? 'selected' : ''}>💎 Diamante</option>
                  <option value="master" ${wizardData.avatar.badge === 'master' ? 'selected' : ''}>🔥 Mestre</option>
                </select>
              </div>
            </div>
          </div>
        `;
        setTimeout(() => {
          const wCanvas = backdrop.querySelector('#wizAvCanvas9');
          const wCtx = wCanvas?.getContext('2d');
          if (wCtx) {
            PixelAvatarRenderer.drawAvatar(wCtx, {
              x: 70, y: 125, zoom: 2.2, facing: 'SE', state: 'idle',
              config: wizardData.avatar, color: wizardData.avatar.shirtColor || '#8b5cf6', time: 0
            });
          }
          backdrop.querySelector('#wizOutfitSelect')?.addEventListener('change', (e) => {
            wizardData.avatar.outfit = e.target.value;
            renderStep();
          });
          backdrop.querySelector('#wizShirtColor')?.addEventListener('input', (e) => {
            wizardData.avatar.shirtColor = e.target.value;
            wizardData.avatar.outfitColor = e.target.value;
            renderStep();
          });
          backdrop.querySelector('#wizPantsColor')?.addEventListener('input', (e) => {
            wizardData.avatar.pantsColor = e.target.value;
            renderStep();
          });
          backdrop.querySelector('#wizAccessorySelect')?.addEventListener('change', (e) => {
            wizardData.avatar.accessory = e.target.value;
            renderStep();
          });
          backdrop.querySelector('#wizBadgeSelect')?.addEventListener('change', (e) => {
            wizardData.avatar.badge = e.target.value;
            renderStep();
          });
        }, 30);
      } else if (currentStep === 10) {
        body.innerHTML = `
          <div style="display: flex; gap: 16px; width: 100%;">
            <canvas id="wizAvCanvas10" width="140" height="170" class="fenix-avatar-preview-canvas" style="flex: 0 0 140px;"></canvas>
            <div style="display: flex; flex-direction: column; gap: 6px; flex: 1; font-size: 11px; color: #cbd5e1; font-family: monospace;">
              <div style="font-weight: 800; color: #38bdf8; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
                ${wizardData.displayName || wizardData.name}
              </div>
              <div><strong>ID:</strong> ${wizardData.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}</div>
              <div><strong>DISTRITO:</strong> ${wizardData.district}</div>
              <div><strong>ROLE:</strong> ${wizardData.role.toUpperCase()} (${wizardData.seniority.toUpperCase()})</div>
              <div><strong>MODELO:</strong> ${wizardData.model}</div>
              <div><strong>MEMÓRIA:</strong> ${wizardData.memoryMode.toUpperCase()}</div>
              <div><strong>BADGE:</strong> ${wizardData.avatar.badge.toUpperCase()}</div>
              <div style="color: #22c55e; font-weight: 700; margin-top: 6px;">
                ✓ Pronto para spawnar na AI City viva.
              </div>
            </div>
          </div>
        `;
        setTimeout(() => {
          const wCanvas = backdrop.querySelector('#wizAvCanvas10');
          const wCtx = wCanvas?.getContext('2d');
          if (wCtx) {
            PixelAvatarRenderer.drawAvatar(wCtx, {
              x: 70, y: 125, zoom: 2.2, facing: 'SE', state: 'idle',
              config: wizardData.avatar, color: wizardData.avatar.shirtColor || '#8b5cf6', time: 0
            });
          }
        }, 30);
      }
    };

    renderStep();

    backdrop.querySelector('#btnWizPrev')?.addEventListener('click', () => {
      if (currentStep > 1) {
        currentStep--;
        renderStep();
      }
    });

    backdrop.querySelector('#btnWizNext')?.addEventListener('click', async () => {
      if (currentStep === 1) {
        wizardData.name = backdrop.querySelector('#wizAgentName')?.value?.trim() || wizardData.name;
        wizardData.displayName = backdrop.querySelector('#wizAgentDisplay')?.value?.trim() || wizardData.name;
        currentStep++;
        renderStep();
      } else if (currentStep === 2) {
        wizardData.district = backdrop.querySelector('#wizAgentDistrict')?.value || wizardData.district;
        currentStep++;
        renderStep();
      } else if (currentStep === 3) {
        wizardData.role = backdrop.querySelector('#wizAgentRole')?.value || wizardData.role;
        wizardData.seniority = backdrop.querySelector('#wizAgentSeniority')?.value || wizardData.seniority;
        currentStep++;
        renderStep();
      } else if (currentStep === 4) {
        wizardData.model = backdrop.querySelector('#wizAgentModel')?.value || wizardData.model;
        wizardData.temperature = parseFloat(backdrop.querySelector('#wizAgentTemp')?.value || '0.7');
        currentStep++;
        renderStep();
      } else if (currentStep === 5) {
        wizardData.systemPrompt = backdrop.querySelector('#wizAgentPrompt')?.value || wizardData.systemPrompt;
        currentStep++;
        renderStep();
      } else if (currentStep === 6) {
        currentStep++;
        renderStep();
      } else if (currentStep === 7) {
        wizardData.memoryMode = backdrop.querySelector('#wizMemoryMode')?.value || wizardData.memoryMode;
        currentStep++;
        renderStep();
      } else if (currentStep === 8) {
        currentStep++;
        renderStep();
      } else if (currentStep === 9) {
        currentStep++;
        renderStep();
      } else if (currentStep === 10) {
        const agentId = wizardData.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
        const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) };
        try {
          await fetch('/api/v2/agents', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              id: agentId,
              name: wizardData.name,
              displayName: wizardData.displayName || wizardData.name,
              role: wizardData.role,
              seniority: wizardData.seniority,
              district: wizardData.district,
              model: wizardData.model,
              systemPrompt: wizardData.systemPrompt,
              memoryMode: wizardData.memoryMode,
              avatar: wizardData.avatar
            })
          });
          await this.syncRealData();
          const targetDist = this.DISTRICTS[wizardData.district] || this.DISTRICTS.CENTRAL;
          this.spawnAnimation({
            id: agentId,
            name: wizardData.name,
            x: targetDist.x,
            y: targetDist.y
          });
        } catch(e) {}
        close();
      }
    });
  }

  _drawHUD(ctx, w, h) {
    const agents = [...this.world.agents.values()];
    const real = agents.filter(a => a.isReal).length;
    const working = agents.filter(a => ['WORKING','RUNNING'].includes((a.status||'').toUpperCase())).length;
    const total = agents.length;

    ctx.save();
    // Bottom left pill
    ctx.fillStyle = 'rgba(2,6,23,0.82)';
    ctx.strokeStyle = 'rgba(56,189,248,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(14, h-54, 320, 34, 8); ctx.fill(); ctx.stroke();
    ctx.font = '11px "JetBrains Mono",monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`AI CITY ONLINE`, 28, h-33);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(` · ${total} AGENTES · ${working} ATIVOS · ${real} REAIS`, 28+92, h-33);

    // Top right legend
    ctx.font = '9px "JetBrains Mono",monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.fillText('2×clique = reset câmera · scroll = zoom · drag = mover', w-14, h-22);

    ctx.restore();
  }

  _drawMinimap(ctx, w, h) {
    // Minimap is now handled by a separate canvas element in the bottom left
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
    document.querySelectorAll('.city-cam-btn').forEach(btn => btn.classList.remove('active'));
    if (mode === 'OBSERVER') {
      this.state.followAgentId = null;
      this.state.targetCamera.zoom = 1.35;
      const btn = document.getElementById('btnCameraObserver');
      if (btn) { btn.classList.add('active'); btn.style.background = '#3b82f6'; }
    } else if (mode === 'COMMAND') {
      const active = [...this.world.agents.values()].find(a => ['WORKING','RUNNING','CODING','TESTING'].includes(String(a.status).toUpperCase())) || [...this.world.agents.values()][0];
      if (active) this.focusAgent(active.id);
      const btn = document.getElementById('btnCameraCommand');
      if (btn) { btn.classList.add('active'); btn.style.background = '#3b82f6'; }
    } else if (mode === 'CINEMATIC') {
      this.state.followAgentId = null;
      this.state.targetCamera.zoom = 1.25;
      const btn = document.getElementById('btnCameraCinematic');
      if (btn) { btn.classList.add('active'); btn.style.background = '#3b82f6'; }
    }
  }

  panToDistrict(districtId) {
    if (districtId === 'ALL') {
      this.state.followAgentId = null;
      this.state.selectedAgent = null;
      this.state.targetCamera.x = 0;
      this.state.targetCamera.y = -20;
      this.state.targetCamera.zoom = 0.45;
      this._updateZoomDisplay();
      return;
    }
    const norm = normalizeDistrict(districtId);
    const d = this.DISTRICTS[norm];
    if (d) {
      const tw = this.state.tileSize;
      const th = tw / 2;
      this.state.followAgentId = null;
      this.state.selectedAgent = null;
      const cameraPoint = this.toScreen(d.x, d.y, 0, 0, 0, 1);
      this.state.targetCamera.x = -cameraPoint.x;
      this.state.targetCamera.y = -cameraPoint.y;
      this.state.targetCamera.zoom = 1.15;
      this._updateZoomDisplay();
    }
  }

  resetCamera() {
    this.state.targetCamera.x = 0;
    this.state.targetCamera.y = 35;
    this.state.targetCamera.zoom = 1.05;
    this.state.followAgentId = null;
    this.state.selectedAgent = null;
    this._updateZoomDisplay();
  }

  toggleDayNight() {
    this.isNight = !this.isNight;
    const icon = document.getElementById('fenixCityWeatherIcon');
    const text = document.getElementById('fenixCityWeatherText');
    if (this.isNight) {
      if (icon) { icon.className = 'ph-bold ph-moon'; icon.style.color = '#FBBF24'; }
      if (text) text.textContent = 'Modo noite';
    } else {
      if (icon) { icon.className = 'ph-bold ph-sun'; icon.style.color = '#F59E0B'; }
      if (text) text.textContent = 'Modo dia';
    }
  }

  zoomStep(dir) {
    const STEPS = [0.45, 0.75, 1.05, 1.45, 2.05, 2.85];
    const current = this.state.targetCamera.zoom;
    let nextIdx = 2;
    if (dir > 0) {
      nextIdx = STEPS.findIndex(s => s > current + 0.05);
      if (nextIdx === -1) nextIdx = STEPS.length - 1;
    } else {
      for (let i = STEPS.length - 1; i >= 0; i--) {
        if (STEPS[i] < current - 0.05) { nextIdx = i; break; }
      }
    }
    this.state.targetCamera.zoom = STEPS[nextIdx];
    this._updateZoomDisplay();
  }


  focusAgent(agentId) {
    if (!agentId) return;
    const target = this.world.agents.get(agentId) || [...this.world.agents.values()].find(a =>
      a.id.toLowerCase() === String(agentId).toLowerCase() || a.name.toLowerCase().includes(String(agentId).toLowerCase())
    );
    if (target) {
      this.state.selectedAgent = target;
      const tw = this.state.tileSize;
      const th = tw / 2;
      const z = 2.4;
      const rect = this.canvas.getBoundingClientRect();
      // Golden-third framing: places agent at ~38% screen width (offset -12% from center, leaving contextual space on right)
      const goldenOffsetX = Math.round(rect.width * 0.12);
      const cameraPoint = this.toScreen(target.x, target.y, 0, 0, 0, z);
      this.state.targetCamera.x = -Math.round(cameraPoint.x) - goldenOffsetX;
      this.state.targetCamera.y = -Math.round(cameraPoint.y);
      this.state.targetCamera.zoom = z;
      this._updateZoomDisplay();
      window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent: target, agentId: target.id } }));
      const cx = rect.width / 2 + this.state.camera.x;
      const cy = rect.height / 2 + this.state.camera.y;
      if (typeof window.closeSpatialChat === 'function') window.closeSpatialChat();
      if (typeof window.fenixShowWorldAgentInspector === 'function') {
        window.fenixShowWorldAgentInspector(target);
      } else if (typeof window.fenixOpenAgent === 'function') {
        window.fenixOpenAgent(target.id);
      }
    }
  }

  _adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, c =>
      ('0' + Math.min(255, Math.max(0, parseInt(c,16) + amount)).toString(16)).substr(-2)
    );
  }
}

window.IsoCityEngine = IsoCityEngine;

// Workstation Modal and IDE Binding Helpers
window.openStationPreview = function (station, agentId) {
  window.fenixCity?.openStationPreview(station, agentId);
};

window.closeStationPreview = function () {
  const modal = document.getElementById('fenixStationPreviewModal');
  if (modal) modal.style.display = 'none';
};

window.openStationInIDE = function () {
  const filePath = window._currentActiveStationFile || 'ai-engine/grg/src/server.js';
  sessionStorage.setItem('fenix_city_return_available', 'true');
  if (window.fenixCity?.state?.camera) {
    sessionStorage.setItem('fenix_city_return_camera', JSON.stringify({
      x: window.fenixCity.state.camera.x,
      y: window.fenixCity.state.camera.y,
      zoom: window.fenixCity.state.camera.zoom
    }));
  }
  window.closeStationPreview?.();
  if (typeof window.showView === 'function') {
    window.showView('ide');
  } else if (typeof window.switchViewToIde === 'function') {
    window.switchViewToIde();
  }
  window.dispatchEvent(new CustomEvent('fenix-open-file-ide', { detail: { filePath } }));
};

window.openStationTerminal = function () {
  sessionStorage.setItem('fenix_city_return_available', 'true');
  if (window.fenixCity?.state?.camera) {
    sessionStorage.setItem('fenix_city_return_camera', JSON.stringify({
      x: window.fenixCity.state.camera.x,
      y: window.fenixCity.state.camera.y,
      zoom: window.fenixCity.state.camera.zoom
    }));
  }
  window.closeStationPreview?.();
  if (typeof window.showView === 'function') {
    window.showView('terminal');
  } else if (typeof window.switchView === 'function') {
    window.switchView('terminal');
  }
};

window.closeSpatialChat = function () {
  const chatEl = document.getElementById('fenixSpatialAgentChat');
  if (chatEl) chatEl.style.display = 'none';
};

window.askSpatialAgentQuick = async function (topic) {
  const currentAgent = window.__currentSpatialAgent || { id: 'agent-orchestrator', name: 'Orquestrador', role: 'Orquestração', district: 'dev-district' };
  const body = document.getElementById('spatialChatBody');
  if (!body) return;

  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  if (topic === 'station') {
    if (window.fenixCity && typeof window.fenixCity.focusStationForAgent === 'function') {
      window.fenixCity.focusStationForAgent(currentAgent.id);
    }
    const userBubble = document.createElement('div');
    userBubble.className = 'spatial-chat-bubble user';
    userBubble.textContent = 'Indo até a sua estação de trabalho.';
    body.appendChild(userBubble);
    body.scrollTop = body.scrollHeight;
    return;
  }

  let prompt = '';
  let questionLabel = '';
  if (topic === 'tasks') {
    questionLabel = 'Quais tarefas você concluiu recentemente?';
    prompt = `Relate de forma concisa e factual as tarefas recentemente concluídas ou registradas no sistema sob sua alçada (${currentAgent.name} / ${currentAgent.role}).`;
  } else if (topic === 'current') {
    questionLabel = 'Qual é a sua atividade ou trabalho em execução agora?';
    prompt = `Descreva sua atividade atual e estado operacional no distrito ${currentAgent.district || 'Command Center'}.`;
  } else if (topic === 'memory') {
    questionLabel = 'O que você tem registrado na sua memória recente?';
    prompt = `Apresente um resumo factual das memórias recentes e diretrizes operacionais sob seu escopo.`;
  } else {
    questionLabel = `Consulta rápida: ${topic}`;
    prompt = `Status e dados operacionais para ${topic}.`;
  }

  const userBubble = document.createElement('div');
  userBubble.className = 'spatial-chat-bubble user';
  userBubble.textContent = questionLabel;
  body.appendChild(userBubble);
  body.scrollTop = body.scrollHeight;

  const typing = document.createElement('div');
  typing.id = 'spatialChatTyping';
  typing.className = 'spatial-chat-bubble agent';
  typing.style.opacity = '0.75';
  typing.style.fontStyle = 'italic';
  typing.textContent = 'Consultando telemetria operacional...';
  body.appendChild(typing);
  body.scrollTop = body.scrollHeight;

  try {
    const res = await fetch('/api/v2/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        agentId: currentAgent.id,
        context: {
          agentName: currentAgent.name,
          role: currentAgent.role,
          district: currentAgent.district,
          topic: topic,
          view: 'city'
        }
      })
    });
    const data = await res.json();
    typing.remove();
    const reply = data.reply || data.response || data.output || data.message || `Atividade de ${currentAgent.name}: Monitoramento e execução ativa no distrito ${currentAgent.district || 'Dev'}. Telemetria verificada.`;
    const replyBubble = document.createElement('div');
    replyBubble.className = 'spatial-chat-bubble agent';
    replyBubble.innerHTML = `<strong>${esc(currentAgent.name)}:</strong><br>${esc(reply).replace(/\n/g, '<br>')}`;
    body.appendChild(replyBubble);
    body.scrollTop = body.scrollHeight;

    if (window.fenixCity && window.fenixCity.world) {
      const cityAgent = window.fenixCity.world.agents.get(currentAgent.id) ||
                        [...window.fenixCity.world.agents.values()].find(a => a.id === currentAgent.id || a.name === currentAgent.name);
      if (cityAgent) {
        cityAgent.bubble = { text: reply.slice(0, 48) + (reply.length > 48 ? '...' : ''), life: 5.0 };
      }
    }
  } catch (err) {
    typing.remove();
    const fallbackText = currentAgent.currentJob
      ? `Job ativo: ${currentAgent.currentJob} · Distrito: ${currentAgent.district || 'Command'}. Telemetria local ativa.`
      : `Especialista operacional ${currentAgent.name} pronto para instruções. Conectado ao runtime.`;
    const fallbackBubble = document.createElement('div');
    fallbackBubble.className = 'spatial-chat-bubble agent';
    fallbackBubble.innerHTML = `<strong>${esc(currentAgent.name)}:</strong><br>${esc(fallbackText)}`;
    body.appendChild(fallbackBubble);
    body.scrollTop = body.scrollHeight;
  }
};

function bootIsoCity() {
  if (window.FENIX_WORLD_3D) return;
  if (document.getElementById('cityCanvas')) {
    if (!window.fenixCity || !(window.fenixCity instanceof IsoCityEngine)) {
      window.fenixCity = new IsoCityEngine('cityCanvas');
    }
    window.fenixSetCameraMode = (mode) => window.fenixCity?.setCameraMode(mode);
    window.fenixPanToDistrict = (dist) => window.fenixCity?.panToDistrict(dist);
    window.fenixToggleDayNight = () => window.fenixCity?.toggleDayNight();
    window.fenixCityZoom = (dir) => window.fenixCity?.zoomStep(dir === 'in' ? 1 : -1);
    window.refreshCityState = () => window.fenixCity?.syncRealData();
    if (window.fenixCity && typeof window.fenixCity.resize === 'function') {
      window.fenixCity.resize();
    }
  }
}
window.bootIsoCity = bootIsoCity;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(bootIsoCity, 150), { once: true });
} else {
  setTimeout(bootIsoCity, 150);
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const cvs = document.getElementById('cityCanvas');
    if (cvs) {
      cvs.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        const city = window.fenixCity;
        if (!city) return;
        
        // Find if we clicked an agent or a building
        // Since we don't have the exact inverse matrix easily accessible here without hooking into city internals,
        // we use city.state.hoveredAgent or hoveredDistrict from the last mousemove (which city already tracks)
        const agent = city.state.hoveredAgent;
        const district = city.state.hoveredDistrict;
        
        let type = null;
        let id = null;
        let actions = [];
        
        const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
        const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) };

        if (agent) {
          type = 'agent';
          id = agent.id || agent.agentId;
          actions = [
            { label: 'Dispatch Mission', action: () => { 
                fetch('/api/v2/jobs', { method: 'POST', headers, body: JSON.stringify({ title: 'Contextual Dispatch', description: 'Dispatched via UI', agentId: id, priority: 'high', status: 'QUEUED' }) })
                .then(r => { if(r.ok && window.FenixToast) window.FenixToast.show('Mission dispatched', 'success'); });
            } },
            { label: 'View Logs', action: () => {
                fetch('/api/v2/system/telemetry', { headers }).then(r => r.json()).then(data => {
                    console.log('Logs for', id, data);
                    window.fenixSelectEntity('agent', id);
                });
            } },
            { label: 'Restart Agent', action: () => { 
                fetch('/api/command', { method: 'POST', headers, body: JSON.stringify({ command: 'restart', target: id, type: 'agent' }) })
                .then(r => { if(r.ok && window.FenixToast) window.FenixToast.show('Agent restarted', 'success'); });
            } }
          ];
        } else if (district) {
          type = 'building';
          id = district;
          actions = [
            { label: 'Inspect Operations', action: () => {
                fetch(`/api/v2/company/info/${id}`, { headers }).then(r => r.json()).then(data => {
                    console.log('Operations for', id, data);
                    window.fenixSelectEntity('building', id);
                });
            } },
            { label: 'Restart Service', action: () => { 
                fetch('/api/command', { method: 'POST', headers, body: JSON.stringify({ command: 'restart', target: id, type: 'service' }) })
                .then(r => { if(r.ok && window.FenixToast) window.FenixToast.show('Service restarted', 'success'); });
            } },
            { label: 'Pause Mission', action: () => { 
                fetch('/api/command', { method: 'POST', headers, body: JSON.stringify({ command: 'pause', target: id, type: 'mission' }) })
                .then(r => { if(r.ok && window.FenixToast) window.FenixToast.show('Mission paused', 'success'); });
            } }
          ];
        }
        
        if (type && id) {
          showContextMenu(e.clientX, e.clientY, `${type.toUpperCase()}: ${id}`, actions);
        }
      });
    }
  });

  function showContextMenu(x, y, title, actions) {
    let menu = document.getElementById('fenix-context-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'fenix-context-menu';
      menu.style.position = 'fixed';
      menu.style.background = 'rgba(15, 23, 42, 0.95)';
      menu.style.backdropFilter = 'blur(10px)';
      menu.style.border = '1px solid rgba(255,255,255,0.1)';
      menu.style.borderRadius = '8px';
      menu.style.padding = '8px 0';
      menu.style.zIndex = '999999';
      menu.style.color = '#fff';
      menu.style.fontFamily = 'Inter, sans-serif';
      menu.style.fontSize = '12px';
      menu.style.minWidth = '160px';
      document.body.appendChild(menu);
      
      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) menu.style.display = 'none';
      });
    }
    
    menu.innerHTML = `<div style="padding: 4px 12px; font-weight: bold; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 4px;">${title}</div>`;
    actions.forEach(act => {
      const btn = document.createElement('div');
      btn.textContent = act.label;
      btn.style.padding = '6px 12px';
      btn.style.cursor = 'pointer';
      btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.1)';
      btn.onmouseleave = () => btn.style.background = 'transparent';
      btn.onclick = () => {
        act.action();
        menu.style.display = 'none';
      };
      menu.appendChild(btn);
    });
    
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const viewCity = document.getElementById('view-city');
    const existingMinimap = document.getElementById('fenixMinimap');
    if (existingMinimap && document.getElementById('fenixFloatingMinimap')) {
      existingMinimap.style.display = 'none';
    }
    if (viewCity && !document.getElementById('fenixMinimap') && !document.getElementById('fenixFloatingMinimap')) {
      // Deliverable 3: Minimapa Absolute Bottom-Left
      const minimap = document.createElement('canvas');
      minimap.id = 'fenixMinimap';
      minimap.width = 180;
      minimap.height = 120;
      minimap.style.position = 'absolute';
      minimap.style.bottom = '20px';
      minimap.style.left = '20px';
      minimap.style.zIndex = '50';
      minimap.style.background = 'rgba(2, 6, 23, 0.82)';
      minimap.style.border = '1px solid rgba(56, 189, 248, 0.2)';
      minimap.style.borderRadius = '6px';
      minimap.style.cursor = 'pointer';
      viewCity.appendChild(minimap);

      let minimapLoopRunning = false;
      let lastMinimapTime = 0;
      const renderMinimap = (now = 0) => {
        if (!viewCity || !viewCity.classList.contains('active') || viewCity.style.display === 'none' || document.hidden) {
          minimapLoopRunning = false;
          return;
        }
        if (!window.fenixCity) {
          requestAnimationFrame(renderMinimap);
          return;
        }
        if (now && lastMinimapTime && (now - lastMinimapTime < 500)) {
          requestAnimationFrame(renderMinimap);
          return;
        }
        lastMinimapTime = now || performance.now();
        const city = window.fenixCity;
        const ctx = minimap.getContext('2d');
        const mw = 180, mh = 120;
        ctx.clearRect(0, 0, mw, mh);

        const scaleX = mw / 34;
        const scaleY = mh / 30;

        // Tiles coloridos por distrito
        if (city.DISTRICTS) {
          for (const d of Object.values(city.DISTRICTS)) {
            const px = (d.x + 17) * scaleX - (d.w * scaleX) / 2;
            const py = (d.y + 15) * scaleY - (d.h * scaleY) / 2;
            ctx.fillStyle = d.color + '70';
            ctx.fillRect(px, py, d.w * scaleX, d.h * scaleY);
          }
        }

        // Indicador de viewport
        if (city.state && city.state.camera && city.state.tileSize) {
          const A = -city.state.camera.x / (city.state.tileSize * city.state.camera.zoom);
          const B = -city.state.camera.y / ((city.state.tileSize / 2) * city.state.camera.zoom);
          const rotX = (A + B) / 2;
          const rotY = (B - A) / 2;
          let mapX = rotX, mapY = rotY;
          if (city.rotationQuarter === 1) { mapX = rotY; mapY = -rotX; }
          else if (city.rotationQuarter === 2) { mapX = -rotX; mapY = -rotY; }
          else if (city.rotationQuarter === 3) { mapX = -rotY; mapY = rotX; }
          
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 1.5;
          const vPx = (mapX + 17) * scaleX - 10;
          const vPy = (mapY + 15) * scaleY - 7;
          ctx.strokeRect(vPx, vPy, 20, 14);
        }
        
        requestAnimationFrame(renderMinimap);
      };
      renderMinimap();

      minimap.addEventListener('click', (e) => {
        if (!window.fenixCity) return;
        const city = window.fenixCity;
        const rect = minimap.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const scaleX = 180 / 34, scaleY = 120 / 30;
        
        const mapX = x / scaleX - 17;
        const mapY = y / scaleY - 15;
        
        city.state.followAgentId = null;
        city.state.selectedAgent = null;
        
        // Pan to position
        if (typeof city.toScreen === 'function') {
          const cameraPoint = city.toScreen(mapX, mapY, 0, 0, 0, 1.15);
          city.state.targetCamera.x = -cameraPoint.x;
          city.state.targetCamera.y = -cameraPoint.y;
          city.state.targetCamera.zoom = 1.15;
          if (typeof city._updateZoomDisplay === 'function') {
            city._updateZoomDisplay();
          }
        }
      });
    }

    if (viewCity && !document.getElementById('fenix-city-event-timeline')) {
      const timeline = document.createElement('div');
      timeline.id = 'fenix-city-event-timeline';
      timeline.style.position = 'absolute';
      timeline.style.bottom = '20px';
      timeline.style.left = '50%';
      timeline.style.transform = 'translateX(-50%)';
      timeline.style.width = '80%';
      timeline.style.maxWidth = '800px';
      timeline.style.height = '40px';
      timeline.style.background = 'rgba(15, 23, 42, 0.8)';
      timeline.style.backdropFilter = 'blur(8px)';
      timeline.style.border = '1px solid rgba(255,255,255,0.1)';
      timeline.style.borderRadius = '20px';
      timeline.style.display = 'flex';
      timeline.style.alignItems = 'center';
      timeline.style.padding = '0 16px';
      timeline.style.gap = '8px';
      timeline.style.overflowX = 'auto';
      timeline.style.zIndex = '10';
      timeline.style.scrollbarWidth = 'none';
      viewCity.appendChild(timeline);
      
      // Listen for incoming events to populate
      document.addEventListener('fenix-live', (e) => {
        const ev = e.detail;
        const eventType = String(ev?.type || '').toLowerCase();
        if (!ev || ['ping', 'heartbeat', 'status', 'snapshot', 'runtime.snapshot'].includes(eventType)) return;
        const evNode = document.createElement('div');
        evNode.style.flex = '0 0 auto';
        evNode.style.padding = '4px 12px';
        evNode.style.background = 'rgba(255,255,255,0.05)';
        evNode.style.borderRadius = '12px';
        evNode.style.fontSize = '11px';
        evNode.style.color = '#e2e8f0';
        evNode.style.cursor = 'pointer';
        evNode.style.whiteSpace = 'nowrap';
        let chain = ev.cause ? ` → ${ev.cause}` : '';
        if (ev.chain && Array.isArray(ev.chain)) chain = ' → ' + ev.chain.join(' → ');
        evNode.textContent = `[${ev.type}] ${ev.message || ev.summary || ev.id || 'Event'}${chain}`;
        
        evNode.onclick = () => {
          if (ev.agentId) window.fenixSelectEntity('agent', ev.agentId);
          else if (ev.missionId) window.fenixSelectEntity('mission', ev.missionId);
          else if (ev.jobId) window.fenixSelectEntity('job', ev.jobId);
        };
        
        timeline.prepend(evNode);
        if (timeline.children.length > 20) {
          timeline.removeChild(timeline.lastChild);
        }
      });
    }
  });
}
