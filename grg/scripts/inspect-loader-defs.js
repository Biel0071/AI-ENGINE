const fs = require('fs');

const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

// Find all occurrences of window.load*View = ... or load*View
const matches = [...html.matchAll(/window\.(load[A-Za-z0-9_]*View)\s*=\s*/g)];
for (const m of matches) {
  const start = m.index;
  console.log(`\n=================== ${m[1]} at offset ${start} ===================`);
  console.log(html.slice(start, start + 1200));
}
