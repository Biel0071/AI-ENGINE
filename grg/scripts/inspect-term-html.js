const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const start = html.indexOf('id="view-terminal"');
console.log(html.slice(start, start + 2500));
