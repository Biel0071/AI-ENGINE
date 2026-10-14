const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const ideStart = html.indexOf('window.loadIdeView = async function()');
console.log('=== loadIdeView FULL ===');
console.log(html.slice(ideStart, ideStart + 2200));

const termStart = html.indexOf('window.loadTerminalView = async function()');
console.log('\n=== loadTerminalView FULL ===');
console.log(html.slice(termStart, termStart + 2500));
