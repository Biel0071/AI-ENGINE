const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const idx = html.indexOf('window.loadIdeView =');
console.log('Context before window.loadIdeView:');
console.log(html.slice(idx - 600, idx + 100));
