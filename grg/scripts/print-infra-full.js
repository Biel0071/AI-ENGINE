const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const start = html.indexOf('window.loadInfrastructureView = async function');
const end = html.indexOf('  // Real Job Details Modal', start);
console.log(html.slice(start, end !== -1 ? end : start + 6000));
