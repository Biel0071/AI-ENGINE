const fs = require('fs');

const iso = fs.readFileSync('/opt/fenix-os/public/iso-city.js', 'utf8');
const fetches = [...iso.matchAll(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/g)].map(m => m[1]);
console.log('Fetches in iso-city.js:', [...new Set(fetches)]);

const syncIdx = iso.indexOf('syncRealData');
if (syncIdx !== -1) {
  console.log('=== syncRealData in iso-city.js ===');
  console.log(iso.slice(syncIdx, syncIdx + 1500));
}
