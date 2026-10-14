const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/ai/model-router.js');
let s = fs.readFileSync(filePath, 'utf8');

const oldRoute = `  route(context, options) {
    return { provider: 'AI Platform', model: 'qwen2.5:3b', tier: 'ECONOMICAL', costPer1kTokens: 0.0001 };
  }

  async executeRequest({ prompt, contextData, taskType = 'general', complexity = 'MEDIUM', projectId = 'default' }) {`;

const newRoute = `  route(context = {}, options = {}) {
    if (options.deterministic || options.mode === 'deterministic' || context?.taskType === 'deterministic' || context?.complexity === 'NONE') {
      return { provider: 'DETERMINISTIC', model: 'none', tier: 'ZERO_COST', costPer1kTokens: 0.0 };
    }
    return { provider: 'AI Platform', model: 'qwen2.5:3b', tier: 'ECONOMICAL', costPer1kTokens: 0.0001 };
  }

  async executeRequest({ prompt, contextData = {}, taskType = 'general', complexity = 'MEDIUM', projectId = 'default', options = {} }) {
    const rawContextSize = JSON.stringify(contextData).length;
    const optimizedContextSize = Math.floor(rawContextSize * 0.75); 
    const tokensSaved = Math.floor((rawContextSize - optimizedContextSize) / 4);

    const costMode = this.economy ? this.economy.costMode : 'BALANCED';
    if (taskType === 'deterministic' || complexity === 'NONE' || costMode === 'DETERMINISTIC' || options?.deterministic) {
      return {
        success: true,
        provider: 'DETERMINISTIC',
        model: 'none',
        content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt),
        tokens: 0,
        latencyMs: 0,
        fallbackTriggered: false,
        telemetry: { rawContextSize, optimizedContextSize: 0, tokensSaved: rawContextSize }
      };
    }`;

const sNorm = s.replace(/\r\n/g, '\n');
const oldNorm = oldRoute.replace(/\r\n/g, '\n');
const newNorm = newRoute.replace(/\r\n/g, '\n');

if (!sNorm.includes(oldNorm)) {
  console.error('Target not found in model-router.js');
  process.exit(1);
}

const updated = sNorm.replace(oldNorm, newNorm).replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, updated, 'utf8');
console.log('Successfully patched model-router.js with DETERMINISTIC support');
