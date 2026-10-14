const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

console.log(html.slice(171250, 173500));
