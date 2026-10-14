const fs = require('fs');

const obs = fs.readFileSync('/opt/fenix-os/public/observatory-client.js', 'utf8');
const idx = obs.indexOf('function renderLegacyManifestAndGraph');
console.log(obs.slice(idx, idx + 2000));
