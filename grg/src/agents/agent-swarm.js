const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError } = require('../kernel/errors');

class AgentSwarm {
  constructor({ store, bus, controlPlane, fabricEvents }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.fabricEvents = fabricEvents;

    this.specialists = [
      { id: 'agent-architect', name: 'Arquiteto', domain: 'architecture', role: 'System Architecture & Component Design' },
      { id: 'agent-backend', name: 'Backend', domain: 'backend', role: 'API, DB & Core Logic Engineering' },
      { id: 'agent-frontend', name: 'Frontend', domain: 'frontend', role: 'UI/UX & Web Client Engineering' },
      { id: 'agent-ux', name: 'UX Designer', domain: 'ux', role: 'User Interface & Interaction Design' },
      { id: 'agent-qa', name: 'QA Tester', domain: 'qa', role: 'Quality Assurance & Automated Testing' },
      { id: 'agent-devops', name: 'DevOps', domain: 'devops', role: 'CI/CD Pipelines, Docker & Infrastructure' },
      { id: 'agent-db', name: 'DB Specialist', domain: 'database', role: 'Data Models, Migrations & Performance' },
      { id: 'agent-security', name: 'Segurança', domain: 'security', role: 'Audit, RBAC, Encryption & Penetration Safeguards' },
      { id: 'agent-docs', name: 'Documentação', domain: 'documentation', role: 'Technical Docs, OpenAPI & Architecture Diagrams' },
      { id: 'agent-obs', name: 'Observabilidade', domain: 'observability', role: 'Metrics, Logging, Telemetry & Tracing' },
      { id: 'agent-ai', name: 'IA Gateway', domain: 'ai', role: 'Model Routing, Prompts & LLM Orchestration' },
      { id: 'agent-memory', name: 'Memória', domain: 'memory', role: 'Hierarchical Memory & Capsule Consolidation' },
      { id: 'agent-knowledge', name: 'Knowledge', domain: 'knowledge', role: 'Knowledge Graph Maintenance & Relationships' },
      { id: 'agent-twin', name: 'Digital Twin', domain: 'twin', role: 'Live System Projections & Twin Synchronization' },
      { id: 'agent-planner', name: 'Planner', domain: 'planner', role: 'Mission Decomposition & Subtask DAG Scheduling' },
    ];
  }

  async dispatchEvent(tenantId, actorId, swarmEvent = {}) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    if (!swarmEvent.type || !swarmEvent.targetAgent) {
      throw new ValidationError('Swarm event requires type and targetAgent');
    }

    const agent = this.specialists.find((s) => s.id === swarmEvent.targetAgent || s.domain === swarmEvent.targetAgent);
    if (!agent) {
      throw new NotFoundError(`Specialized agent not found: ${swarmEvent.targetAgent}`);
    }

    const payload = {
      id: uuid(),
      tenantId,
      sourceAgent: swarmEvent.sourceAgent || 'master-avatar',
      targetAgent: agent.id,
      agentName: agent.name,
      domain: agent.domain,
      type: String(swarmEvent.type),
      data: swarmEvent.data || {},
      timestamp: new Date().toISOString(),
    };

    if (this.fabricEvents) {
      await this.fabricEvents.publish({
        tenantId,
        stream: `swarm:${agent.id}`,
        type: 'swarm.event.dispatched',
        source: 'agent-swarm',
        subject: payload.id,
        data: payload,
      });
    } else if (this.bus?.emit) {
      await this.bus.emit('swarm.event.dispatched', payload);
    }

    return payload;
  }

  async listAgents(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    return { agents: this.specialists, total: this.specialists.length };
  }
}

module.exports = { AgentSwarm };
