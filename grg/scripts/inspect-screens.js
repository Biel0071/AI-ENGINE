const fs = require('fs');

const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');
console.log('HTML length:', html.length);

const views = [...html.matchAll(/id="(view-[^"]+)"/g)].map(m => m[1]);
console.log('View containers:', JSON.stringify(views, null, 2));

const loaders = [...html.matchAll(/function\s+(load[A-Za-z0-9_]+)/g)].map(m => m[1]);
console.log('Loaders:', JSON.stringify(loaders, null, 2));

const navItems = [...html.matchAll(/data-view="([^"]+)"/g)].map(m => m[1]);
console.log('Nav data-views:', JSON.stringify([...new Set(navItems)], null, 2));

const routeAliasesMatch = html.match(/const\s+ROUTE_ALIASES\s*=\s*(\{[\s\S]*?\});/);
if (routeAliasesMatch) {
  console.log('ROUTE_ALIASES:', routeAliasesMatch[0]);
}

// Check showView implementation
const showViewMatch = html.match(/function\s+showView\s*\([\s\S]*?\n\}/);
if (showViewMatch) {
  console.log('showView sample (first 400 chars):', showViewMatch[0].slice(0, 400));
}
