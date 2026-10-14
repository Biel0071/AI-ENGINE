const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const start = html.indexOf('window.loadTerminalView = async function');
const end = html.indexOf('window.loadMemoryView = async function', start);
console.log(html.slice(start, end !== -1 ? end : start + 6000));
