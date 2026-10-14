const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const start = html.indexOf('window.loadKnowledgeView = async function');
const end = html.indexOf('window.loadMcpView = async function', start);

console.log('start:', start, 'end:', end);
console.log('Context around end:');
console.log(html.slice(end - 150, end + 50));
