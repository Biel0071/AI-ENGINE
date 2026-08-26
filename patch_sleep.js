const fs = require('fs');
let code = fs.readFileSync('grg/src/software-factory/dev-pipeline.js', 'utf8');
code = code.replace(
  "fs.writeFileSync(readmePath, content, 'utf8');",
  "await new Promise(r => setTimeout(r, 6000));\n        fs.writeFileSync(readmePath, content, 'utf8');"
);
fs.writeFileSync('grg/src/software-factory/dev-pipeline.js', code, 'utf8');
console.log('Added sleep to dev pipeline');
