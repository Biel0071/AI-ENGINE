const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const refPath = 'C:/Users/Dell/.gemini/antigravity/brain/7a8ad23c-1ef2-444e-80e2-30f2f87f38fe/.user_uploaded/media_1790957515047.jpg';
  const imgData = fs.readFileSync(refPath);
  const base64 = imgData.toString('base64');
  
  await page.setContent(`
    <html>
      <body style="margin:0; padding:0; background:#000;">
        <img id="ref" src="data:image/jpeg;base64,${base64}" />
        <canvas id="canvas"></canvas>
      </body>
    </html>
  `);

  await page.waitForFunction(() => {
    const img = document.getElementById('ref');
    return img && img.complete && img.naturalWidth > 0;
  });

  const analysis = await page.evaluate(() => {
    const img = document.getElementById('ref');
    const canvas = document.getElementById('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Scan for left sidebar boundary: where does the dark left sidebar (#0B111E / #0D1527) end?
    // Sample along y = 300 from x = 0 to 300
    let leftBound = 0;
    for (let x = 0; x < 250; x++) {
      const p = ctx.getImageData(x, 300, 1, 1).data;
      // City background has greener/bluer/varied content, sidebar is dark navy
      if (p[0] > 30 || p[1] > 35 || p[2] > 45) {
        leftBound = x;
        break;
      }
    }

    // Scan for right sidebar boundary: where does the dark right sidebar begin?
    let rightBound = canvas.width;
    for (let x = canvas.width - 1; x > 650; x--) {
      const p = ctx.getImageData(x, 300, 1, 1).data;
      if (p[0] > 30 || p[1] > 35 || p[2] > 45) {
        rightBound = x;
        break;
      }
    }

    // Scan for topbar boundary: along x = 400 from y = 0 to 100
    let topBound = 0;
    for (let y = 0; y < 100; y++) {
      const p = ctx.getImageData(400, y, 1, 1).data;
      if (p[0] > 30 || p[1] > 40 || p[2] > 50) {
        topBound = y;
        break;
      }
    }

    // Scan for bottom bar boundary: along x = 400 from y = canvas.height-1 down to 550
    let bottomBound = canvas.height;
    for (let y = canvas.height - 1; y > 550; y--) {
      const p = ctx.getImageData(400, y, 1, 1).data;
      if (p[0] > 30 || p[1] > 40 || p[2] > 50) {
        bottomBound = y;
        break;
      }
    }

    return {
      w: canvas.width,
      h: canvas.height,
      leftBound,
      rightBound,
      topBound,
      bottomBound
    };
  });

  console.log('Image dimensions and layout bounds:', JSON.stringify(analysis, null, 2));

  // Also crop the Depósito Mais warehouse building cutaway from right sidebar:
  // In media_1790957515047.jpg, let's export:
  // 1. The full master image to assets/fenix-metropolis-hd.jpg
  fs.copyFileSync(refPath, path.join(__dirname, '../public/assets/fenix-metropolis-hd.jpg'));
  console.log('Saved fenix-metropolis-hd.jpg');

  // 2. The cropped city region to assets/fenix-city-canvas-hd.png
  // Left: ~115, Top: ~40, Width: ~675, Height: ~600
  const cityDataUrl = await page.evaluate(() => {
    const img = document.getElementById('ref');
    const c = document.createElement('canvas');
    // City bounds: cleanly between left sidebar (x=114) and right sidebar (x=782)
    const sx = 115;
    const sy = 46;
    const sw = 667;
    const sh = 596;
    c.width = sw;
    c.height = sh;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    return c.toDataURL('image/png');
  });

  const base64City = cityDataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(path.join(__dirname, '../public/assets/fenix-city-canvas-hd.png'), Buffer.from(base64City, 'base64'));
  console.log('Saved fenix-city-canvas-hd.png');

  // 3. Crop Depósito Mais warehouse illustration from right sidebar
  const warehouseDataUrl = await page.evaluate(() => {
    const img = document.getElementById('ref');
    const c = document.createElement('canvas');
    // In right sidebar: x is around 805 to 1010, y is around 94 to 170
    // Let's grab the warehouse card image (approximately sx=805, sy=94, sw=205, sh=76)
    const sx = 804;
    const sy = 94;
    const sw = 208;
    const sh = 78;
    c.width = sw;
    c.height = sh;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    return c.toDataURL('image/png');
  });

  const base64Warehouse = warehouseDataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(path.join(__dirname, '../public/assets/deposito-mais-warehouse.png'), Buffer.from(base64Warehouse, 'base64'));
  console.log('Saved deposito-mais-warehouse.png');

  await browser.close();
})();
