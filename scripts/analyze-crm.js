const fs = require('fs/promises');
const path = require('path');
const { runProjectAnalysis } = require('../engine/runAnalysis');

async function run() {
  const crmPath = path.resolve(__dirname, '..', '..', 'ZAPAI-CRM');
  const result = await runProjectAnalysis(crmPath);

  const outputDir = path.join(crmPath, 'ai-analysis');
  const outputFile = path.join(outputDir, 'runtime-state.json');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputFile, JSON.stringify(result, null, 2), 'utf8');

  console.log(`[ai-engine] CRM analysis saved at ${outputFile}`);
}

if (require.main === module) {
  run().catch((error) => {
    console.error('[ai-engine] analyze-crm failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  run,
};
