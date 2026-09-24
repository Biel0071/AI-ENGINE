const fs = require('node:fs');
const file = process.argv[2];
if (!file) throw new Error('Route file required');
let source = fs.readFileSync(file, 'utf8');
const pattern = /'x-api-key': 'ap_live_[^']+'/;
if (!pattern.test(source) && !source.includes("'x-api-key': apiKey")) throw new Error('API Platform key anchor missing');
if (!source.includes("require('../security/secret-resolver')")) {
  source = source.replace("const fs = require('fs');", "const { resolveAIProviderKey } = require('../security/secret-resolver');\nconst fs = require('fs');");
}
source = source.replace(pattern, "'x-api-key': apiKey");
const route = "  if (method === 'POST' && pathname === '/api/v2/api-platform/test-chat') {";
if (!source.includes('const apiKey = resolveAIProviderKey();')) {
  source = source.replace(route, `${route}\n    const apiKey = resolveAIProviderKey();\n    if (!apiKey) return sendJson(res, 503, { ok: false, error: 'API Platform key is not configured' });`);
}
fs.writeFileSync(file, source);
