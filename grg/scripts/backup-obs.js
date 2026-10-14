const fs = require('fs');

const src = '/opt/fenix-os/public/observatory-client.js';
const dst = '/opt/fenix-os/backups/observatory-client_pre_patch.js';
fs.copyFileSync(src, dst);
console.log('Backed up observatory-client.js to', dst);
