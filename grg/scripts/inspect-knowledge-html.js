const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const start = html.indexOf('id="view-knowledge"');
const end = html.indexOf('id="view-mcp"', start);
console.log(html.slice(start, end));
