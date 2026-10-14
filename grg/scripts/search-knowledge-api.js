const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const matches = [...html.matchAll(/\/api\/v2\/knowledge/g)];
console.log('Matches for /api/v2/knowledge in index.html:', matches.length);
matches.forEach(m => {
  console.log(html.slice(Math.max(0, m.index - 100), Math.min(html.length, m.index + 200)));
});
