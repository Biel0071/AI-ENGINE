const fs = require('fs');

console.log('=== frontend-gateway.js (first 60 lines) ===');
console.log(fs.readFileSync('/opt/fenix-os/frontend-gateway.js', 'utf8').split('\n').slice(0, 60).join('\n'));

console.log('=== universal-system-routes.js (first 60 lines) ===');
console.log(fs.readFileSync('/opt/fenix-os/universal-system-routes.js', 'utf8').split('\n').slice(0, 60).join('\n'));
