const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');

// Find all src and href
const regex = /(?:src|href)=["']([^"']+)["']/g;
let match;
const missingInHtml = [];
const foundInHtml = [];

while ((match = regex.exec(html)) !== null) {
  const url = match[1];
  if (url.startsWith('http') || url.startsWith('//') || url.startsWith('data:') || url.startsWith('#')) continue;
  const cleanUrl = url.split('?')[0].split('#')[0];
  const filePath = path.join(PUBLIC_DIR, cleanUrl);
  if (!fs.existsSync(filePath)) {
    missingInHtml.push(cleanUrl);
  } else {
    foundInHtml.push(cleanUrl);
  }
}

console.log('Missing assets directly in index.html:', missingInHtml);

// Find missing in all css files
const cssFiles = fs.readdirSync(PUBLIC_DIR).filter(f => f.endsWith('.css'));
const missingInCss = [];

for (const cssFile of cssFiles) {
  const cssContent = fs.readFileSync(path.join(PUBLIC_DIR, cssFile), 'utf8');
  const urlRegex = /url\(["']?([^"')]+)["']?\)/g;
  let urlMatch;
  while ((urlMatch = urlRegex.exec(cssContent)) !== null) {
    const rawUrl = urlMatch[1];
    if (rawUrl.startsWith('data:') || rawUrl.startsWith('http') || rawUrl.startsWith('//')) continue;
    const cleanUrl = rawUrl.split('?')[0].split('#')[0];
    const targetPath = path.join(PUBLIC_DIR, cleanUrl);
    if (!fs.existsSync(targetPath)) {
      missingInCss.push({ cssFile, missingAsset: cleanUrl });
    }
  }
}

console.log(`Found ${missingInCss.length} missing assets referenced in CSS files:`, missingInCss.slice(0, 30));

// Also count inline style tags in index.html
const styleBlocks = (html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).length;
console.log(`Count of <style> blocks in index.html: ${styleBlocks}`);

// Count style="" attributes in index.html
const inlineStyles = (html.match(/\sstyle="[^"]*"/gi) || []).length;
console.log(`Count of style="" attributes in index.html: ${inlineStyles}`);

// Count linked CSS files in index.html
const linkedCss = (html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) || []).length;
console.log(`Count of linked CSS stylesheets in index.html: ${linkedCss}`);
