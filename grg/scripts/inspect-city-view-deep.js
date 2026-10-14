const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

// 1. Find all mentions of 'city' in dispatchLoader
const dispatchIdx = html.indexOf('const dispatchLoader =');
console.log('=== dispatchLoader (lines around city) ===');
console.log(html.slice(dispatchIdx, dispatchIdx + 1500));

// 2. Find view-city HTML content
const viewCityStart = html.indexOf('id="view-city"');
const viewCityEnd = html.indexOf('</div>', html.indexOf('id="view-projects"'));
console.log('\n=== view-city container HTML ===');
console.log(html.slice(viewCityStart, html.indexOf('id="view-projects"')));

// 3. Find all <script> tags in index.html related to city
const scriptTags = [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*>/g)].map(m => m[1]);
console.log('\n=== Script tags in index.html ===');
console.log(scriptTags.filter(s => s.toLowerCase().includes('city')));
