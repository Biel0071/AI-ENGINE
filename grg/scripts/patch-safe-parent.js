const fs = require('fs');

const indexPath = '/opt/fenix-os/public/index.html';
let content = fs.readFileSync(indexPath, 'utf8');

content = content.replace(
  "if (!terminalBtn.__fenixBound) {\n        const cleanBtn = terminalBtn.cloneNode(true);\n        cleanBtn.__fenixBound = true;\n        terminalBtn.parentNode.replaceChild(cleanBtn, terminalBtn);",
  "if (terminalBtn.parentNode && !terminalBtn.__fenixBound) {\n        const cleanBtn = terminalBtn.cloneNode(true);\n        cleanBtn.__fenixBound = true;\n        terminalBtn.parentNode.replaceChild(cleanBtn, terminalBtn);"
);

fs.writeFileSync(indexPath, content, 'utf8');
console.log('Safe parentNode replace applied to index.html');

if (fs.existsSync('/opt/fenix-os/grg/public/index.html')) {
  fs.writeFileSync('/opt/fenix-os/grg/public/index.html', content, 'utf8');
  console.log('Synced to /opt/fenix-os/grg/public/index.html');
}
