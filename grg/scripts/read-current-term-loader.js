const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const s = html.indexOf('window.loadTerminalView = async function()');
console.log(html.slice(s, s + 3500));
