const fs = require('fs');
let code = fs.readFileSync('public/unified-app.js', 'utf8');

// replace $('something').addEventListener with $('something')?.addEventListener
code = code.replace(/\$\('([^']+)'\)\.addEventListener/g, "$$('$1')?.addEventListener");

fs.writeFileSync('public/unified-app.js', code);
