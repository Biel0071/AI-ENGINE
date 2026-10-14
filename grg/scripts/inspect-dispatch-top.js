const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const dispatchIdx = html.indexOf('const dispatchLoader =');
console.log(html.slice(dispatchIdx, dispatchIdx + 2000));
