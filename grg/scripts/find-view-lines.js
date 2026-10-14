const fs = require('fs');
const html = fs.readFileSync('ai-engine/grg/public/index.html', 'utf8');
const lines = html.split('\n');
const views = [
  'view-command',
  'view-city',
  'view-agents',
  'view-ide',
  'view-projects',
  'view-operations',
  'view-runtime',
  'view-memory',
  'view-knowledge',
  'view-mcp',
  'view-browser',
  'view-observability',
  'view-terminal',
  'view-flowgraph'
];

views.forEach(v => {
  lines.forEach((l, i) => {
    if (l.includes(`id="${v}"`)) {
      console.log(`${v} at line ${i + 1}`);
    }
  });
});
