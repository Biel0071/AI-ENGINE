const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '../grg/public');
const server = http.createServer((req, res) => {
  let file = req.url.split('?')[0];
  if (file === '/' || file === '/app') file = '/index.html';
  const filePath = path.join(publicDir, file);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.png': 'image/png',
      '.ico': 'image/x-icon',
      '.svg': 'image/svg+xml'
    };
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(4498, async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:4498/app#city', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Open sidebar
  await page.evaluate(() => {
    if (window.fenixMascotSidebar) window.fenixMascotSidebar.open();
  });
  await page.waitForTimeout(400);

  // Click on Central / Fenix HQ district
  await page.evaluate(() => {
    if (window.fenixPanToDistrict) {
      window.fenixPanToDistrict('command-center');
    }
  });
  await page.waitForTimeout(600);

  await page.screenshot({ path: 'scratch/city-district-selected.png' });
  console.log('Saved scratch/city-district-selected.png');

  await browser.close();
  server.close();
  process.exit(0);
});
