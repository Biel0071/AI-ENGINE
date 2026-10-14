const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const matches = [...html.matchAll(/syncCityPlacement/g)];
matches.forEach(m => {
  console.log(`syncCityPlacement at ${m.index}:`);
  console.log(html.slice(Math.max(0, m.index - 50), Math.min(html.length, m.index + 400)));
});
