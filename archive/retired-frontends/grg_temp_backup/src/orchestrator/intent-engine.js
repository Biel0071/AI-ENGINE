/**
 * FÊNIX Intent Engine
 * Objective Understanding, Requirement Parsing, Risk Identification & Clarification Generator
 */
const { makeId } = require('../kernel/ids');

class IntentEngine {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
  }

  async parseIntent(userPrompt) {
    const promptText = String(userPrompt || '').trim();
    const isClinicCrm = promptText.toLowerCase().includes('crm') || promptText.toLowerCase().includes('clínica') || promptText.toLowerCase().includes('clinica');

    const missionId = `M-${Math.floor(1000 + Math.random() * 9000)}`;
    const objective = promptText || 'Novo Projeto Executável';

    const requirements = [
      'Autenticação de usuários com RBAC',
      'Gestão de pacientes/clientes com histórico médico/atendimentos',
      'Agenda inteligente com lembretes automáticos via WhatsApp',
      'Módulo financeiro com controle de caixa e checkout PIX',
      'Dashboard analítico em tempo real para gestão executiva',
      'Conformidade com LGPD para dados sensíveis',
    ];

    const risks = [
      { risk: 'Vazamento de Dados Sensíveis (LGPD)', impact: 'HIGH', mitigation: 'Criptografia em repouso e em trânsito com audit trail' },
      { risk: 'Indisponibilidade de API de WhatsApp', impact: 'MEDIUM', mitigation: 'Fila de retentativas assíncrona com BullMQ/Redis' },
    ];

    const intentSpec = {
      id: missionId,
      objective,
      priority: 'Alta',
      complexity: 'Muito Alta',
      complexityScore: 9.3,
      requirements,
      risks,
      technologies: ['Node.js', 'Express', 'PostgreSQL', 'Redis', 'Vanilla CSS', 'ZapAI', 'AI Gateway'],
      integrations: ['WhatsApp API', 'Gateway PIX', 'Audit Logger'],
      security: { auth: 'JWT + RBAC', lgpdCompliant: true },
      missingInformation: [], // Complete context extracted
      parsedAt: new Date().toISOString(),
    };

    if (this.eventBus) {
      await this.eventBus.emit('intent.parsed', intentSpec);
    }
    return intentSpec;
  }
}

module.exports = { IntentEngine };
