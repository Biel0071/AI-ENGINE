const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const start = html.indexOf('window.loadInfrastructureView =');
const end = html.indexOf('window.loadVisualQaDashboard =', start);
console.log(html.slice(start, end));
