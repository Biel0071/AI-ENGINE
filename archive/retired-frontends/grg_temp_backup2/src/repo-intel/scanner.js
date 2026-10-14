// Scanner leve e determinístico sobre a árvore de arquivos. Não é um parser AST completo:
// extrai sinais (linguagens, deps, endpoints, componentes) suficientes para grafo + capabilities.
// O adapter tree-sitter real pluga aqui depois, enriquecendo o mesmo formato de saída.

const LANG_BY_EXT = {
  '.js': 'javascript', '.jsx': 'javascript', '.ts': 'typescript', '.tsx': 'typescript',
  '.py': 'python', '.go': 'go', '.rb': 'ruby', '.java': 'java', '.php': 'php',
  '.sql': 'sql', '.css': 'css', '.html': 'html', '.json': 'json', '.md': 'markdown',
  '.yml': 'yaml', '.yaml': 'yaml', '.sh': 'shell',
};

// Assinaturas de capability: se o sinal aparece na árvore, a capability é candidata.
const CAPABILITY_SIGNALS = [
  { id: 'whatsapp-crm', category: 'communication', any: [/baileys/i, /whatsapp/i, /venom-bot/i] },
  { id: 'ai-gateway', category: 'ai', any: [/openai/i, /anthropic/i, /litellm/i, /ollama/i] },
  { id: 'payments-pix', category: 'payments', any: [/\bpix\b/i, /mercadopago/i, /mercado-pago/i, /asaas/i, /pagar\.?me/i] },
  { id: 'payments-stripe', category: 'payments', any: [/stripe/i] },
  { id: 'auth-rbac', category: 'auth', any: [/rbac/i, /permission/i, /role[-_ ]?based/i, /jsonwebtoken/i, /\bjwt\b/i] },
  { id: 'analytics', category: 'analytics', any: [/posthog/i, /mixpanel/i, /\bga4\b/i, /analytics/i] },
  { id: 'realtime', category: 'infra', any: [/socket\.io/i, /websocket/i, /server-sent/i] },
  { id: 'ecommerce', category: 'commerce', any: [/checkout/i, /catalog|catálogo/i, /\bcart\b/i, /orders?/i] },
  { id: 'dashboard', category: 'ui', any: [/dashboard/i, /recharts/i, /chart\.js/i] },
];

function ext(path) {
  const i = path.lastIndexOf('.');
  return i >= 0 ? path.slice(i).toLowerCase() : '';
}

function detectEndpoints(content) {
  const endpoints = [];
  const re = /\b(?:app|router|api)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  let m;
  while ((m = re.exec(content))) endpoints.push({ method: m[1].toUpperCase(), path: m[2] });
  return endpoints;
}

function detectComponents(path, content) {
  const comps = [];
  if (/\.(tsx|jsx)$/.test(path)) {
    const re = /(?:export\s+default\s+function|export\s+function|function)\s+([A-Z][A-Za-z0-9_]+)/g;
    let m;
    while ((m = re.exec(content))) comps.push(m[1]);
  }
  return comps;
}

function scan(tree) {
  const languages = {};
  const deps = new Set();
  const endpoints = [];
  const components = [];
  const tables = new Set();
  const haystack = [];

  for (const file of tree.files) {
    const e = ext(file.path);
    const lang = LANG_BY_EXT[e];
    if (lang) languages[lang] = (languages[lang] || 0) + 1;
    const content = String(file.content || '');
    haystack.push(file.path.toLowerCase(), content.toLowerCase());

    if (file.path.endsWith('package.json')) {
      try {
        const pkg = JSON.parse(content);
        Object.keys(pkg.dependencies || {}).forEach((d) => deps.add(d));
        Object.keys(pkg.devDependencies || {}).forEach((d) => deps.add(d));
      } catch { /* ignore malformed */ }
    }
    detectEndpoints(content).forEach((ep) => endpoints.push({ ...ep, file: file.path }));
    detectComponents(file.path, content).forEach((c) => components.push({ name: c, file: file.path }));

    const tableRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?["`]?([a-z0-9_]+)/gi;
    let tm;
    while ((tm = tableRe.exec(content))) tables.add(tm[1]);
  }

  const blob = haystack.join('\n');
  const capabilities = CAPABILITY_SIGNALS
    .filter((sig) => sig.any.some((rx) => rx.test(blob)))
    .map((sig) => ({ id: sig.id, category: sig.category }));

  const primaryLanguage = Object.entries(languages).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    revision: tree.revision,
    fileCount: tree.files.length,
    primaryLanguage,
    languages,
    dependencies: [...deps].sort(),
    endpoints,
    components,
    tables: [...tables].sort(),
    capabilities,
  };
}

module.exports = { scan, CAPABILITY_SIGNALS };
