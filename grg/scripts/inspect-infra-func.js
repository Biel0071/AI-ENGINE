const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const target = 'window.loadInfrastructureView = async function';
const start = html.indexOf(target);
console.log('start index:', start);
if (start !== -1) {
  console.log(html.slice(start, start + 3000));
}
