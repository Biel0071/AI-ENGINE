const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const idx = html.indexOf('window.loadIdeView = async function');
console.log('Context before window.loadIdeView = async function (offset ' + idx + '):');
console.log(html.slice(idx - 600, idx + 100));
