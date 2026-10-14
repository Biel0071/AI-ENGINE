const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');

/**
 * PromptRuntime v2.0
 * Gerencia templates de prompts e injeta contexto (Capabilities, Memória) antes do AIGateway.
 * Garante que nenhum módulo monte strings manualmente no código.
 */
class PromptRuntime extends SystemModule {
  constructor(knowledgeGraph, capabilityGraph) {
    super('prompt_runtime', '2.0.0');
    this.knowledgeGraph = knowledgeGraph;
    this.capabilityGraph = capabilityGraph;
    this.templates = new Map();
    this.status = STATE_MACHINE.BOOT;
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    console.log('[PromptRuntime] Carregando catálogo de templates...');
    
    // Na V2 real, leríamos do banco de dados ou arquivos MD
    this.registerTemplate('mission_planner', 'Você é o Mission Planner. Objetivo: {{goal}}. Restrições: {{constraints}}. Contexto Semântico: {{context}}. Capabilities disponíveis: {{capabilities}}.');
    
    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
  }

  registerTemplate(id, templateString) {
    this.templates.set(id, templateString);
  }

  /**
   * Constrói o prompt final mesclando o template com as variáveis dinâmicas do Kernel.
   */
  async buildPrompt(templateId, variables = {}, entityId = null) {
    if (!this.templates.has(templateId)) {
      throw new Error(`Template de prompt não encontrado: ${templateId}`);
    }

    let template = this.templates.get(templateId);

    // Injeção autônoma de contexto se o nó do Knowledge Graph for fornecido
    if (entityId && this.knowledgeGraph) {
      const kgContext = this.knowledgeGraph.getContext(entityId);
      variables.context = kgContext ? JSON.stringify(kgContext) : 'Sem contexto prévio.';
    }

    // Injeção autônoma de Capabilities
    if (this.capabilityGraph) {
      const caps = this.capabilityGraph.getCapabilities ? this.capabilityGraph.getCapabilities() : [];
      variables.capabilities = JSON.stringify(caps.map(c => c.id));
    }

    // Substituição das tags mustache-like {{var}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, typeof value === 'object' ? JSON.stringify(value) : value);
    }

    return template;
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        registeredTemplates: this.templates.size
      }
    };
  }
}

module.exports = { PromptRuntime };
