const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple static server for public/
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

server.listen(4499, async () => {
  console.log('Static test server listening on 4499');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:4499/app#city', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Measure with sidebar open vs closed
  const inspectElements = async (label) => {
    console.log(`\n=== MEASUREMENTS: ${label} ===`);
    const metrics = await page.evaluate(() => {
      const selectors = [
        'body',
        '.fenix-os-layout',
        '.main-body',
        '#mainSidebarNav',
        '.views-container',
        '#view-city',
        '.fenix-city-canvas-area',
        '.fw3-context',
        '#view-command',
        '#view-ide',
        '#fenix-right-sidebar'
      ];
      return selectors.map(sel => {
        const el = document.querySelector(sel);
        if (!el) return { sel, found: false };
        const r = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        return {
          sel,
          found: true,
          rect: { left: r.left, top: r.top, right: r.right, width: r.width, height: r.height },
          computed: {
            display: cs.display,
            position: cs.position,
            width: cs.width,
            maxWidth: cs.maxWidth,
            marginRight: cs.marginRight,
            flex: cs.flex
          }
        };
      });
    });
    console.log(JSON.stringify(metrics, null, 2));
  };

  await inspectElements('INITIAL (Default State)');

  // Now ensure sidebar is open and docked
  await page.evaluate(() => {
    if (window.fenixMascotSidebar) {
      window.fenixMascotSidebar.open();
    }
  });
  await page.waitForTimeout(500);

  await inspectElements('SIDEBAR OPEN & DOCKED');

  // Take a screenshot of current view
  await page.screenshot({ path: 'scratch/city-sidebar-open.png' });
  console.log('Screenshot saved to scratch/city-sidebar-open.png');

  await browser.close();
  server.close();
  process.exit(0);
});
