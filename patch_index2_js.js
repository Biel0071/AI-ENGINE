const fs = require('fs');
let html = fs.readFileSync('grg/public/index.html', 'utf8');
html = html.replace('</body>', '  <script src="/visual-inspector.js"></script>\n</body>');
fs.writeFileSync('grg/public/index.html', html, 'utf8');
console.log('Index patched with visual-inspector.js');
