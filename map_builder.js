const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const grgDir = 'c:\\projetos\\ai-engine-core\\ai-engine\\grg';

const apis = [];
const agents = [];
const uiViews = [];
let frontendFile = fs.readFileSync(path.join(grgDir, 'public', 'unified-app.js'), 'utf-8');

// Basic API extraction
try {
  const routesText = execSync(`findstr /R /C:"app\..*('/api/.*'" ${grgDir}\\server.js`).toString();
  routesText.split('\n').forEach(line => {
    const match = line.match(/app\.(get|post|put|delete)\(['"](\/api\/[^'"]+)['"]/);
    if(match) apis.push({ method: match[1].toUpperCase(), path: match[2] });
  });
} catch(e) {}

// UI View extraction
const viewsMatch = frontendFile.match(/const\s+views\s*=\s*{([\s\S]*?)}/);
if (viewsMatch) {
  // Rough parsing
  const viewNames = viewsMatch[1].match(/[a-zA-Z0-9_]+:\s*`/g);
  if(viewNames) {
    viewNames.forEach(v => uiViews.push({ name: v.replace(/:\s*`/, '').trim() }));
  }
}

// Agents extraction
try {
  const agentFiles = fs.readdirSync(path.join(grgDir, 'src', 'agents'));
  agentFiles.forEach(f => agents.push({ name: f }));
} catch(e) {}

fs.writeFileSync('FENIX_API_MAP.json', JSON.stringify(apis, null, 2));
fs.writeFileSync('FENIX_AGENT_MAP.json', JSON.stringify(agents, null, 2));
fs.writeFileSync('FENIX_UI_GRAPH.json', JSON.stringify(uiViews, null, 2));
console.log("Realistic maps generated.");
