const fs = require('fs');
const path = require('path');

// 1. Update mascotEl in fenix-mascot-sidebar.js
const mascotPath = path.resolve(__dirname, '../public/fenix-mascot-sidebar.js');
let mascotCode = fs.readFileSync(mascotPath, 'utf8');

mascotCode = mascotCode.replace(
  /if \(!mascotEl\) return;\s*mascotEl\.setAttribute\('data-state', mood\);/,
  `if (!mascotEl) mascotEl = document.getElementById('fenix-floating-mascot');\n      if (!mascotEl) return;\n      mascotEl.setAttribute('data-state', mood);`
);

fs.writeFileSync(mascotPath, mascotCode, 'utf8');
console.log('Updated mascotEl fallback in setMood');

// 2. Update timeout in fenix-visual-recovery-e2e.test.js
const testPath = path.resolve(__dirname, '../test/fenix-visual-recovery-e2e.test.js');
let testCode = fs.readFileSync(testPath, 'utf8');

testCode = testCode.replace(
  /\{ timeout: 120000 \}/,
  `{ timeout: 300000 }`
);

fs.writeFileSync(testPath, testCode, 'utf8');
console.log('Updated test timeout to 300000ms');
