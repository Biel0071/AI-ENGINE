const fs = require('fs');

const cp = fs.readFileSync('/opt/fenix-os/public/fenix-command-palette.js', 'utf8');
const matches = [...cp.matchAll(/(initV9City|updateV9CityStatus|loadCityView)/g)];
matches.forEach(m => {
  console.log(`Match ${m[0]} at ${m.index}:`);
  console.log(cp.slice(Math.max(0, m.index - 100), Math.min(cp.length, m.index + 200)));
});
