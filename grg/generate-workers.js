const fs = require('fs');
const path = require('path');

const workers = [
  { name: 'Planner', capability: 'planning' },
  { name: 'Architect', capability: 'architecture' },
  { name: 'Backend', capability: 'backend' },
  { name: 'Frontend', capability: 'ui' },
  { name: 'Database', capability: 'crud' },
  { name: 'DevOps', capability: 'routing' }, // mapping to an existing cap for now
  { name: 'QA', capability: 'audit' },
  { name: 'Security', capability: 'security' },
  { name: 'Documentation', capability: 'summaries' },
  { name: 'Deploy', capability: 'release' }
];

const template = (name, capability) => `const { WorkerBase } = require('../worker-base');

class ${name}Worker extends WorkerBase {
  constructor(options = {}) {
    super({
      ...options,
      name: '${name}',
      version: '1.0.0',
      capabilities: ['${capability}']
    });
  }

  async _performWork(job) {
    // Phase 2.5: Real worker execution delegates to the AIRouter based on capability
    if (this.router && this.router.isAvailable('${capability}')) {
      const result = await this.router.execute('${capability}', {
        prompt: \`Execute job \${job.id} as ${name}. Payload: \${JSON.stringify(job.payload)}\`
      });
      return { success: true, processedBy: this.name, output: result };
    }
    
    // Fallback if no LLM provider is bound for this capability
    return { success: true, processedBy: this.name, simulatedLLM: true };
  }
}

module.exports = { ${name}Worker };
`;

const dir = path.join(__dirname, 'src', 'missions', 'workers');

workers.forEach(w => {
  const filename = w.name.toLowerCase() + '-worker.js';
  fs.writeFileSync(path.join(dir, filename), template(w.name, w.capability));
  console.log('Created ' + filename);
});
