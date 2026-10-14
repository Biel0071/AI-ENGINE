const fs = require('fs');

const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

// Find showView definition
const showViewIdx = html.indexOf('function showView');
if (showViewIdx !== -1) {
  console.log('--- showView definition ---');
  console.log(html.slice(showViewIdx, showViewIdx + 2000));
}

// Find any load* definitions
const loadMatches = [...html.matchAll(/(?:async\s+function|function|const|let|var|window\.)\s*(load[A-Za-z0-9_]*View[A-Za-z0-9_]*)/g)];
console.log('--- load*View matches ---');
loadMatches.forEach(m => console.log(m[0]));

// Search for mentions of view-city, view-project, view-knowledge, view-ide, view-terminal
const targetViews = ['view-city', 'view-project', 'view-knowledge', 'view-ide', 'view-terminal'];
for (const v of targetViews) {
  console.log(`\n=== SEARCH FOR ${v} ===`);
  let idx = 0;
  let count = 0;
  while ((idx = html.indexOf(v, idx)) !== -1 && count < 5) {
    console.log(`Match at ${idx}:`);
    console.log(html.slice(Math.max(0, idx - 100), Math.min(html.length, idx + 250)));
    console.log('---');
    idx += v.length;
    count++;
  }
}
