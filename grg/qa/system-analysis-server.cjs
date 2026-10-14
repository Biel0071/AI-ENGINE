// Isolated canonical runtime for visual QA. Never uses the operator's persisted state.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { start } = require('../src/server');
(async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-analysis-qa-'));
  const password = crypto.randomBytes(24).toString('base64url');
  const server = await start(4498, { dataFile: path.join(temp, 'state.json'), llm: false,
    env: { FENIX_ENV: 'test', FENIX_AI_DEFAULT_PROVIDER: 'echo', FENIX_AI_DEFAULT_MODEL: 'echo-small' },
    bootstrapAdmin: { tenantId: 'analysis-qa', userId: 'qa-admin', password, role: 'master_admin', tenantName: 'Analysis QA' } });
  const session = await server.app.auth.login('analysis-qa', 'qa-admin', password);
  await fs.mkdir(path.join(__dirname, '../qa-results/system-analysis'), { recursive: true });
  await fs.writeFile(path.join(__dirname, '../qa-results/system-analysis/session.json'), JSON.stringify({ baseURL: 'http://127.0.0.1:4498', token: session.token, temp }), { mode: 0o600 });
  console.log('ANALYSIS_QA_READY http://127.0.0.1:4498');
  process.on('SIGINT', () => server.close(() => process.exit(0)));
})().catch(e => { console.error(e.message); process.exit(1); });
