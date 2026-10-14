const fs = require('fs');

const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

// Find showView definition completely
const showViewIdx = html.indexOf('function showView(');
if (showViewIdx !== -1) {
  // Find closing brace or end of function
  const snippet = html.slice(showViewIdx, showViewIdx + 4000);
  console.log('=== SHOWVIEW FUNCTION ===');
  console.log(snippet.slice(0, 2000));
}

// Find occurrences of loadCityView or city loading logic
console.log('=== CITY LOADING ===');
const cityMatches = [...html.matchAll(/(loadCity[A-Za-z0-9_]*|initCity[A-Za-z0-9_]*|renderCity[A-Za-z0-9_]*)/g)];
console.log('City function names:', cityMatches.map(m => m[0]));

// Search for where showView handles 'city'
const showViewFull = html.slice(showViewIdx, showViewIdx + 4000);
const cityCase = showViewFull.indexOf('city');
console.log('city in showView around idx:', cityCase);
if (cityCase !== -1) {
  console.log(showViewFull.slice(Math.max(0, cityCase - 100), cityCase + 300));
}

// Check window.loadIdeView
const ideIdx = html.indexOf('window.loadIdeView =');
if (ideIdx !== -1) {
  console.log('=== LOAD IDE VIEW ===');
  console.log(html.slice(ideIdx, ideIdx + 1500));
}

// Check window.loadTerminalView
const termIdx = html.indexOf('window.loadTerminalView =');
if (termIdx !== -1) {
  console.log('=== LOAD TERMINAL VIEW ===');
  console.log(html.slice(termIdx, termIdx + 1500));
}

// Check window.loadInfrastructureView
const infraIdx = html.indexOf('window.loadInfrastructureView =');
if (infraIdx !== -1) {
  console.log('=== LOAD INFRASTRUCTURE VIEW ===');
  console.log(html.slice(infraIdx, infraIdx + 2000));
}
