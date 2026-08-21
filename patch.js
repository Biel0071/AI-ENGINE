const fs = require('fs');
let code = fs.readFileSync('grg/public/unified-app.js', 'utf8');
code = code.replace(/\$\('([^']+)'\)\.innerHTML\s*=/g, 'if ($(\'$1\')) $(\'$1\').innerHTML =');
fs.writeFileSync('grg/public/unified-app.js', code);
