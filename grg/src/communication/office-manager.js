'use strict';

/**
 * FÊNIX OS — Office Manager (Fase 14)
 * ====================================
 * Manages spatial offices and team suites across the 7 canonical districts.
 * Connects physical/isometric layout positions to real agent identities.
 */

const { OFFICE_TYPES, COMMUNICATION_EVENTS } = require('./communication-events');
const { globalCommunicationBus } = require('./agent-communication-bus');

const CANONICAL_OFFICES = [
  // 1. Command Center / Executive
  {
    officeId: 'office-ceo',
    name: 'Gabinete Executivo (CEO)',
    type: OFFICE_TYPES.PRIVATE_OFFICE,
    ownerAgentId: 'agent.ceo',
    districtId: 'command-center',
    position: { x: 2, y: 1 },
    capacity: 4,
    status: 'OPEN'
  },
  {
    officeId: 'office-architect',
    name: 'Estúdio de Arquitetura de Sistemas',
    type: OFFICE_TYPES.PRIVATE_OFFICE,
    ownerAgentId: 'agent-architect',
    districtId: 'command-center',
    position: { x: 3, y: 1 },
    capacity: 4,
    status: 'OPEN'
  },
  {
    officeId: 'office-planner',
    name: 'Sala de Planejamento de Missões',
    type: OFFICE_TYPES.PRIVATE_OFFICE,
    ownerAgentId: 'agent-planner',
    districtId: 'command-center',
    position: { x: 2, y: 2 },
    capacity: 4,
    status: 'OPEN'
  },

  // 2. Dev District / Engineering Bay
  {
    officeId: 'office-backend',
    name: 'Engenharia de Backend & APIs',
    type: OFFICE_TYPES.TEAM_ROOM,
    ownerAgentId: 'agent-backend',
    districtId: 'dev-district',
    position: { x: -6, y: 2 },
    capacity: 6,
    status: 'OPEN'
  },
  {
    officeId: 'office-frontend',
    name: 'Estúdio de Frontend & Design Systems',
    type: OFFICE_TYPES.TEAM_ROOM,
    ownerAgentId: 'agent-frontend',
    districtId: 'creative-district',
    position: { x: 6, y: 4 },
    capacity: 6,
    status: 'OPEN'
  },
  {
    officeId: 'office-ux',
    name: 'Laboratório de Experiência do Usuário (UX)',
    type: OFFICE_TYPES.PRIVATE_OFFICE,
    ownerAgentId: 'agent-ux',
    districtId: 'creative-district',
    position: { x: 7, y: 4 },
    capacity: 4,
    status: 'OPEN'
  },

  // 3. Verification & Security Lab
  {
    officeId: 'office-qa',
    name: 'Laboratório de Qualidade & Testes (QA)',
    type: OFFICE_TYPES.TEAM_ROOM,
    ownerAgentId: 'agent-qa',
    districtId: 'dev-district',
    position: { x: -5, y: 3 },
    capacity: 6,
    status: 'OPEN'
  },
  {
    officeId: 'office-security',
    name: 'Posto de Segurança Zero-Trust & Vault',
    type: OFFICE_TYPES.PRIVATE_OFFICE,
    ownerAgentId: 'agent-security',
    districtId: 'data-center',
    position: { x: 0, y: 6 },
    capacity: 4,
    status: 'OPEN'
  },
  {
    officeId: 'office-docs',
    name: 'Oficina de Especificações & Documentação',
    type: OFFICE_TYPES.PRIVATE_OFFICE,
    ownerAgentId: 'agent-docs',
    districtId: 'dev-district',
    position: { x: -7, y: 3 },
    capacity: 4,
    status: 'OPEN'
  },

  // 4. Data Center & Cognitive AI
  {
    officeId: 'office-ai',
    name: 'Núcleo Neural & Inferência Cognitiva',
    type: OFFICE_TYPES.TEAM_ROOM,
    ownerAgentId: 'agent-ai',
    districtId: 'ai-district',
    position: { x: 6, y: -3 },
    capacity: 8,
    status: 'OPEN'
  },
  {
    officeId: 'office-knowledge',
    name: 'Biblioteca RAG & Ontologia Viva',
    type: OFFICE_TYPES.PRIVATE_OFFICE,
    ownerAgentId: 'agent-knowledge',
    districtId: 'ai-district',
    position: { x: 7, y: -3 },
    capacity: 4,
    status: 'OPEN'
  },
  {
    officeId: 'office-memory',
    name: 'Cofre da Memória Episódica & Grafos',
    type: OFFICE_TYPES.PRIVATE_OFFICE,
    ownerAgentId: 'agent-memory',
    districtId: 'data-center',
    position: { x: 1, y: 6 },
    capacity: 4,
    status: 'OPEN'
  },
  {
    officeId: 'office-db',
    name: 'Administração de Estado & Bancos Relacionais',
    type: OFFICE_TYPES.PRIVATE_OFFICE,
    ownerAgentId: 'agent-db',
    districtId: 'data-center',
    position: { x: -1, y: 6 },
    capacity: 4,
    status: 'OPEN'
  },

  // 5. Observatory & SRE
  {
    officeId: 'office-devops',
    name: 'Central de Deploy & Orquestração CI/CD',
    type: OFFICE_TYPES.PRIVATE_OFFICE,
    ownerAgentId: 'agent-devops',
    districtId: 'observatory',
    position: { x: -6, y: -4 },
    capacity: 4,
    status: 'OPEN'
  },
  {
    officeId: 'office-obs',
    name: 'Ponte de Comando de Observabilidade & Métricas',
    type: OFFICE_TYPES.PRIVATE_OFFICE,
    ownerAgentId: 'agent-obs',
    districtId: 'observatory',
    position: { x: -5, y: -4 },
    capacity: 4,
    status: 'OPEN'
  },
  {
    officeId: 'office-twin',
    name: 'Câmara do Digital Twin & Simulação',
    type: OFFICE_TYPES.PRIVATE_OFFICE,
    ownerAgentId: 'agent-twin',
    districtId: 'project-district',
    position: { x: -6, y: -2 },
    capacity: 6,
    status: 'OPEN'
  },

  // 6. Specialized Collective Spaces
  {
    officeId: 'room-war-room',
    name: 'War Room de Incidentes Críticos',
    type: OFFICE_TYPES.WAR_ROOM,
    ownerAgentId: null,
    districtId: 'command-center',
    position: { x: 4, y: 1 },
    capacity: 10,
    status: 'IDLE'
  },
  {
    officeId: 'room-meeting-a',
    name: 'Sala de Reuniões Alfa (Estratégia)',
    type: OFFICE_TYPES.MEETING_ROOM,
    ownerAgentId: null,
    districtId: 'command-center',
    position: { x: 4, y: 2 },
    capacity: 8,
    status: 'OPEN'
  },
  {
    officeId: 'room-review',
    name: 'Sala de Revisão Técnica & Design Gate',
    type: OFFICE_TYPES.REVIEW_ROOM,
    ownerAgentId: null,
    districtId: 'dev-district',
    position: { x: -4, y: 2 },
    capacity: 6,
    status: 'OPEN'
  },
  {
    officeId: 'room-lounge',
    name: 'Lounge Central & Café da Cidade',
    type: OFFICE_TYPES.LOUNGE,
    ownerAgentId: null,
    districtId: 'command-center',
    position: { x: 0, y: 0 },
    capacity: 16,
    status: 'OPEN'
  }
];

class OfficeManager {
  constructor(options = {}) {
    this.bus = options.bus || globalCommunicationBus;
    this.logger = options.logger || console;

    this.offices = new Map(); // officeId -> Office
    this.agentToOffice = new Map(); // agentId -> officeId

    this._initializeOffices();
  }

  _initializeOffices() {
    for (const def of CANONICAL_OFFICES) {
      const office = {
        ...def,
        participants: [],
        currentConversationId: null,
        activeIncidentId: null,
        updatedAt: new Date().toISOString()
      };
      this.offices.set(office.officeId, office);
      if (office.ownerAgentId) {
        this.agentToOffice.set(office.ownerAgentId, office.officeId);
      }
    }
  }

  getOffice(officeId) {
    return this.offices.get(officeId) || null;
  }

  getOfficeForAgent(agentId) {
    const officeId = this.agentToOffice.get(agentId) || `office-${agentId}`;
    return this.offices.get(officeId) || null;
  }

  listOffices(filter = {}) {
    let list = Array.from(this.offices.values());
    if (filter.districtId) {
      list = list.filter(o => o.districtId === filter.districtId);
    }
    if (filter.type) {
      list = list.filter(o => o.type === filter.type);
    }
    if (filter.status) {
      list = list.filter(o => o.status === filter.status);
    }
    return list;
  }

  updateOfficeStatus(officeId, status, patch = {}) {
    const office = this.offices.get(officeId);
    if (!office) throw new Error(`Office not found: ${officeId}`);

    office.status = status;
    Object.assign(office, patch, { updatedAt: new Date().toISOString() });
    return office;
  }

  addParticipant(officeId, agentOrUserId) {
    const office = this.offices.get(officeId);
    if (!office) throw new Error(`Office not found: ${officeId}`);

    if (!office.participants.includes(agentOrUserId)) {
      office.participants.push(agentOrUserId);
      office.updatedAt = new Date().toISOString();
    }
    return office;
  }

  removeParticipant(officeId, agentOrUserId) {
    const office = this.offices.get(officeId);
    if (!office) return null;

    office.participants = office.participants.filter(id => id !== agentOrUserId);
    office.updatedAt = new Date().toISOString();
    return office;
  }
}

const globalOfficeManager = new OfficeManager();

module.exports = {
  OfficeManager,
  globalOfficeManager,
  CANONICAL_OFFICES
};
