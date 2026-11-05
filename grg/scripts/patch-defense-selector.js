const fs = require('fs');
const path = require('path');

const testPath = path.resolve(__dirname, '../test/fenix-visual-recovery-e2e.test.js');
let code = fs.readFileSync(testPath, 'utf8');

code = code.replace(
  /const socTabs = await page\.locator\('\.def-tab-btn'\)\.count\(\);/,
  `const socTabs = await page.locator('#fenixDefenseTabs button, #fenixDefenseTabs .fenix-pill-tab').count();`
);

fs.writeFileSync(testPath, code, 'utf8');
console.log('Updated defense tab selector in fenix-visual-recovery-e2e.test.js');
