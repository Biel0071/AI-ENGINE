const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

function printSlice(title, offset, len = 2000) {
  console.log(`\n=================== ${title} (offset ${offset}) ===================`);
  console.log(html.slice(offset, offset + len));
}

printSlice('window.loadIdeView', 235110, 2500);
printSlice('window.loadTerminalView', 241793, 2500);
printSlice('window.loadKnowledgeView', 254260, 2500);
printSlice('window.loadInfrastructureView', 277759, 2500);
