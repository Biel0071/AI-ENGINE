const path = require('path');
const { auditTree } = require('./src/governance/simulation-audit');
console.time('auditTree');
auditTree(path.join(__dirname, 'src'));
console.timeEnd('auditTree');
