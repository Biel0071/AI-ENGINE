const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const matches = [];
let pos = 0;
while ((pos = html.indexOf('loadTerminalView', pos)) !== -1) {
  matches.push({ pos, snippet: html.slice(Math.max(0, pos - 80), pos + 120) });
  pos += 16;
}
console.log('Matches for loadTerminalView:', JSON.stringify(matches, null, 2));

const termRoute = [];
pos = 0;
while ((pos = html.indexOf('terminal', pos)) !== -1) {
  termRoute.push({ pos, snippet: html.slice(Math.max(0, pos - 40), pos + 80) });
  pos += 8;
  if (termRoute.length > 10) break;
}
console.log('Matches for terminal:', JSON.stringify(termRoute, null, 2));
