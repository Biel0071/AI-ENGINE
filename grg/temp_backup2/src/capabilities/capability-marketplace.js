/**
 * FÊNIX Capability Marketplace
 * Marketplace Catalog for System Capabilities (Name, Description, IO Types, Version, Pricing, Status)
 */
class CapabilityMarketplace {
  constructor(options = {}) {
    this.capabilities = new Map();
    this.seedDefaultCapabilities();
  }

  seedDefaultCapabilities() {
    const caps = [
      {
        id: 'cap.intent_decomposition',
        name: 'Intent Decomposition Engine',
        description: 'Transforms user requests into structured mission specifications',
        inputs: { userPrompt: 'string' },
        outputs: { intentSpec: 'object' },
        version: '1.0.0',
        dependencies: [],
        priceCredits: 10,
        status: 'AVAILABLE',
      },
      {
        id: 'cap.dag_job_orchestrator',
        name: 'DAG Job Orchestration Engine',
        description: 'Generates parallel task execution graphs for agent swarms',
        inputs: { missionSpec: 'object' },
        outputs: { dagGraph: 'object' },
        version: '1.0.0',
        dependencies: ['cap.intent_decomposition'],
        priceCredits: 15,
        status: 'AVAILABLE',
      },
      {
        id: 'cap.one_deploy_automation',
        name: 'OneDeploy Production Containerization',
        description: 'Automates Docker container packaging and VPS deployment',
        inputs: { projectDna: 'object' },
        outputs: { deployUrl: 'string' },
        version: '2.4.0',
        dependencies: [],
        priceCredits: 50,
        status: 'AVAILABLE',
      },
    ];
    caps.forEach((c) => this.capabilities.set(c.id, c));
  }

  listCapabilities() {
    return Array.from(this.capabilities.values());
  }

  getCapability(id) {
    return this.capabilities.get(id) || null;
  }
}

module.exports = { CapabilityMarketplace };
