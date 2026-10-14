const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const pos = 209630;
console.log(html.slice(pos + 300, pos + 1500));
