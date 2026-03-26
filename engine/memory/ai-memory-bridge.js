const fs = require('fs/promises');
const path = require('path');

async function readJsonArray(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

class AIMemoryBridge {
  constructor(options = {}) {
    this.memoryManager = options.memoryManager || null;
    this.filePath =
      options.filePath ||
      path.join(__dirname, '..', 'memory', 'ai-learnings.json');
  }

  async saveLearning(payload = {}) {
    const record = {
      createdAt: new Date().toISOString(),
      type: String(payload.type || 'general').toLowerCase(),
      inputSummary: String(payload.inputSummary || '').slice(0, 1200),
      outputSummary: String(payload.outputSummary || '').slice(0, 4000),
      metadata: payload.metadata || {},
    };

    if (
      this.memoryManager &&
      typeof this.memoryManager.saveAILearning === 'function'
    ) {
      await this.memoryManager.saveAILearning(record);
      return record;
    }

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const current = await readJsonArray(this.filePath);
    const next = [...current, record].slice(-300);
    await fs.writeFile(this.filePath, JSON.stringify(next, null, 2) + '\n', 'utf8');

    return record;
  }
}

module.exports = {
  AIMemoryBridge,
};
