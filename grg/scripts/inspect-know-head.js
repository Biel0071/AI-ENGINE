const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const start = html.indexOf('id="view-knowledge"');
console.log(html.slice(start, start + 1200));
