const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/ai/model-router.js');
let s = fs.readFileSync(filePath, 'utf8');

const target = `    const costMode = this.economy ? this.economy.costMode : 'BALANCED';
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
    }
    const rawContextSize = JSON.stringify(contextData).length;
    const optimizedContextSize = Math.floor(rawContextSize * 0.75); 
    const tokensSaved = Math.floor((rawContextSize - optimizedContextSize) / 4);`;

const replacement = `    const costMode = this.economy ? this.economy.costMode : 'BALANCED';
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
const targetNorm = target.replace(/\r\n/g, '\n');
const replacementNorm = replacement.replace(/\r\n/g, '\n');

if (!sNorm.includes(targetNorm)) {
  console.error('Target not found in model-router.js');
  process.exit(1);
}

const updated = sNorm.replace(targetNorm, replacementNorm).replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, updated, 'utf8');
console.log('Successfully cleaned duplicate declarations in model-router.js');
