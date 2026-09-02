/* Static guard: catches missing/duplicate navigation targets before browser QA. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'qa/frontend-screen-manifest.json'), 'utf8'));
const htmlPath = process.env.FENIX_HTML || path.join(root, 'public/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const nav = [...html.matchAll(/data-view=["']([^"']+)["']/g)].map(m => m[1]);
const views = [...html.matchAll(/id=["']view-([^"']+)["']/g)].map(m => m[1]);
const expected = Object.keys(manifest.screens);
const unique = [...new Set(nav)];
const missingNav = expected.filter(x => !unique.includes(x));
const missingView = expected.filter(x => !views.includes(x));
const duplicateNav = unique.filter(x => nav.filter(y => y === x).length > 1);
const report = { htmlPath, expected: expected.length, nav: unique.length, viewIds: views.length, missingNav, missingView, duplicateNav, pass: !missingNav.length && !missingView.length };
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
