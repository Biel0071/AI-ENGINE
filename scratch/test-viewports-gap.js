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

server.listen(4497, async () => {
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { w: 1920, h: 1080 },
    { w: 1440, h: 900 },
    { w: 1366, h: 768 }
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4497/app#city', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // Open sidebar
    await page.evaluate(() => {
      if (window.fenixMascotSidebar) window.fenixMascotSidebar.open();
    });
    await page.waitForTimeout(400);

    const measurements = await page.evaluate(() => {
      const vc = document.querySelector('.views-container').getBoundingClientRect();
      const city = document.querySelector('#view-city').getBoundingClientRect();
      const sb = document.querySelector('#fenix-right-sidebar').getBoundingClientRect();
      const gap = sb.left - vc.right;
      return {
        viewsContainer: { left: vc.left, right: vc.right, width: vc.width },
        city: { left: city.left, right: city.right, width: city.width },
        sidebar: { left: sb.left, right: sb.right, width: sb.width },
        gapBetweenViewsAndSidebar: gap
      };
    });

    console.log(`Viewport ${vp.w}x${vp.h}:`, JSON.stringify(measurements));
    await context.close();
  }

  await browser.close();
  server.close();
  process.exit(0);
});
