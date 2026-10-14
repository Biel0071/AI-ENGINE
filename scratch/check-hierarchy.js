const fs = require('fs');

const html = fs.readFileSync('ai-engine/grg/public/index.html', 'utf8');

const views = [
  'view-command', 'view-ide', 'view-project', 'view-dna', 'view-metrics',
  'view-city', 'view-projects', 'view-agents', 'view-operations',
  'view-runtime', 'view-memory', 'view-knowledge', 'view-mcp',
  'view-marketplace', 'view-browser', 'view-observability',
  'view-terminal', 'view-flowgraph'
];

const containerPos = html.indexOf('class="views-container"');

for (const v of views) {
  const p = html.indexOf(`id="${v}"`);
  if (p === -1) {
    console.log(v, 'NOT FOUND');
    continue;
  }
  const slice = html.substring(containerPos, p);
  const openDivs = (slice.match(/<div(\s|>)/gi) || []).length;
  const closeDivs = (slice.match(/<\/div>/gi) || []).length;
  console.log(`${v}: depth = ${openDivs - closeDivs}`);
}
