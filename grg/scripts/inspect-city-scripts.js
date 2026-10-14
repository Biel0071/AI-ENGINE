const fs = require('fs');

['city-integration.js', 'iso-city.js', 'pixi-city-renderer.js', 'fenix-city-event-adapter.js'].forEach(file => {
  const p = '/opt/fenix-os/public/' + file;
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    console.log(`=== ${file} (length ${content.length}) ===`);
    const winFuncs = [...content.matchAll(/window\.([A-Za-z0-9_]+)\s*=/g)].map(m => m[1]);
    console.log('window props assigned:', winFuncs);
  }
});
