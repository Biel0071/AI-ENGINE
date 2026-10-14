const fs = require('fs');
const lines = fs.readFileSync('/opt/fenix-os/frontend-gateway.js', 'utf8').split('\n');
console.log(lines.slice(180, 320).join('\n'));
