const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

console.log('observatory-client in index.html:', html.includes('observatory-client'));
console.log('switchObservatoryTab in observatory-client.js:', fs.readFileSync('/opt/fenix-os/public/observatory-client.js', 'utf8').includes('switchObservatoryTab'));
