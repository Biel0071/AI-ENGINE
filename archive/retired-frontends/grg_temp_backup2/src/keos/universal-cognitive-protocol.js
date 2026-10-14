const crypto = require('node:crypto');
const { uuid } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');

// Universal Cognitive Protocol HONESTO.
//
// MEDIDO EM PRODUCAO (2026-07-29): processInput marcava os 13 estagios 'COMPLETED' (incluindo
// 'SEMANTIC ANALYSIS' e 'SIMULATE') e devolvia truthConfidenceScore 0.98 -- sem executar
// nenhum deles, aceitando qualquer `type`. Um pipeline que "completa" analise semantica sem
// um modelo de embedding e o exemplo classico de estagio fabricado.
//
// Agora: allowlist de tipo real (tipo fora da lista e REJEITADO, o pipeline nao inventa
// caminho); os estagios que o runtime SABE executar rodam de verdade (INGEST enderaca o payload
// por hash SHA-256 real); os que dependem de capacidade ausente (analise semantica, simulacao)
// sao declarados NOT_IMPLEMENTED com o motivo -- nunca COMPLETED fabricado. Sem
// truthConfidenceScore inventado.
const SUPPORTED_TYPES = new Set(['PROMPT', 'CODE', 'DOC', 'PDF', 'API', 'MCP', 'PLUGIN', 'GITHUB', 'AI_RESPONSE', 'TEXT']);

class UniversalCognitiveProtocol {
  constructor({ store, bus, controlPlane, knowledgeGenome, cognitiveLaws }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.knowledgeGenome = knowledgeGenome;
    this.cognitiveLaws = cognitiveLaws;
  }

  async processInput(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'memory:write');
    if (!input.type || !input.payload) {
      throw new ValidationError('Input type and payload are required for UCP processing');
    }
    const type = String(input.type).toUpperCase();
    if (!SUPPORTED_TYPES.has(type)) {
      throw new ValidationError(`unsupported UCP input type: ${type}`);
    }

    // INGEST/VALIDATE/CLASSIFY executam de verdade: hash real do payload, checagem de tipo,
    // classificacao. O status de cada um DERIVA de a operacao ter produzido evidencia (nao e
    // literal 'COMPLETED' fixo): sem evidencia, o estagio nao se declara completo.
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(input.payload)).digest('hex');
    const done = (evidence) => (evidence && Object.keys(evidence).length ? 'COMPLETED' : 'FAILED');
    const ingestEv = { payloadHash };
    const validateEv = { type };
    const classifyEv = { classifiedAs: type };

    const stages = [
      { stage: 1, name: 'INGEST', status: done(ingestEv), evidence: ingestEv },
      { stage: 2, name: 'VALIDATE', status: done(validateEv), evidence: validateEv },
      { stage: 3, name: 'CLASSIFY', status: done(classifyEv), evidence: classifyEv },
      // Estagios que dependem de capacidade que o runtime NAO tem: honestamente nao-executados.
      { stage: 4, name: 'SEMANTIC ANALYSIS', status: 'NOT_IMPLEMENTED', reason: 'no embedding model wired in the runtime' },
      { stage: 5, name: 'NORMALIZE', status: 'NOT_IMPLEMENTED', reason: 'depends on semantic analysis' },
      { stage: 6, name: 'KNOWLEDGE GRAPH', status: 'NOT_IMPLEMENTED', reason: 'depends on semantic analysis' },
      { stage: 7, name: 'LINK', status: 'NOT_IMPLEMENTED', reason: 'depends on knowledge graph stage' },
      { stage: 8, name: 'DISTILL', status: 'NOT_IMPLEMENTED', reason: 'depends on semantic analysis' },
      { stage: 9, name: 'SIMULATE', status: 'NOT_IMPLEMENTED', reason: 'no simulation engine wired' },
      { stage: 10, name: 'DECIDE', status: 'NOT_IMPLEMENTED', reason: 'depends on simulation' },
      { stage: 11, name: 'EXECUTE', status: 'NOT_IMPLEMENTED', reason: 'depends on decision' },
      { stage: 12, name: 'MEASURE', status: 'NOT_IMPLEMENTED', reason: 'depends on execution' },
      { stage: 13, name: 'LEARN', status: 'NOT_IMPLEMENTED', reason: 'depends on measurement' },
    ];

    const completed = stages.filter((s) => s.status === 'COMPLETED').length;
    const result = {
      id: uuid(),
      tenantId,
      inputType: type,
      payloadHash,
      stagesCompleted: completed,
      stagesTotal: stages.length,
      stages,
      processedAt: new Date().toISOString(),
    };

    if (this.bus?.emit) {
      await this.bus.emit('ucp.input.processed', { tenantId, ucpId: result.id, inputType: type, stagesCompleted: completed });
    }

    return result;
  }
}

module.exports = { UniversalCognitiveProtocol };
