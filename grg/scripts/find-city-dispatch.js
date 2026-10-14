const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const target = "} else if (viewId === 'city') {";
const idx = html.indexOf(target);
console.log('Found target at:', idx);
console.log(html.slice(idx - 100, idx + 400));
