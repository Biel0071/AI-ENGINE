const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const start = html.indexOf('window.loadKnowledgeView = async function');
const end = html.indexOf('window.loadMcpView = async function', start);
console.log(html.slice(start, end !== -1 ? end : start + 5000));
