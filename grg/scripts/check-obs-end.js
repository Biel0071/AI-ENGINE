const fs = require('fs');

const obs = fs.readFileSync('/opt/fenix-os/public/observatory-client.js', 'utf8');
console.log('=== End of observatory-client.js (last 1000 chars) ===');
console.log(obs.slice(obs.length - 1000));
