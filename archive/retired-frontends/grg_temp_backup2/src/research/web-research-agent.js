const { SystemModule } = require('../../kernel/module');

class WebResearchAgent extends SystemModule {
  constructor({ eventBus = null, contextAssembler = null, devMemory = null } = {}) {
    super('web_research_agent', '1.0.0');
    this.eventBus = eventBus;
    this.contextAssembler = contextAssembler;
    this.devMemory = devMemory;
  }

  async start() {
    this.status = 'ONLINE';
    return this;
  }

  async executeResearch({ query, topic, depth = 'basic' }) {
    if (this.eventBus) this.eventBus.emit('research.started', { query, topic });
    
    let summary = '';
    let sources = [];
    
    try {
      const searchRes = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query));
      if (searchRes.ok) {
         summary = 'Resultados extraidos da web para: ' + query;
         sources.push('https://duckduckgo.com/?q=' + encodeURIComponent(query));
      } else {
         summary = 'Falha ao conectar com o buscador web.';
      }
    } catch(err) {
      summary = 'Erro de rede ao pesquisar: ' + err.message;
    }

    const researchContext = this.contextAssembler ? this.contextAssembler.buildResearchContext({
      topic: topic || query,
      cachedSummary: summary,
      sources
    }) : { topic, summary, sourcesCount: sources.length };

    if (this.devMemory && depth === 'deep') {
      this.devMemory.recordEvent({
        event: 'WEB_RESEARCH_COMPLETED',
        details: researchContext
      });
    }

    if (this.eventBus) this.eventBus.emit('research.completed', researchContext);

    return researchContext;
  }
}

module.exports = { WebResearchAgent };
