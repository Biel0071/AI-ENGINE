const fs = require('fs');

const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

// 1. City View in index.html: HTML container and any script referencing it
const cityIdx = html.indexOf('id="view-city"');
console.log('=== 1. CITY VIEW HTML (500 chars) ===');
console.log(html.slice(cityIdx, cityIdx + 1000));

// Search for any city scripts or canvas setup in index.html
const cityCanvasIdx = html.indexOf('cityCanvas');
console.log('=== 1b. cityCanvas search ===', cityCanvasIdx);
if (cityCanvasIdx !== -1) {
  console.log(html.slice(cityCanvasIdx - 100, cityCanvasIdx + 500));
}

// 2. Infrastructure View: window.loadInfrastructureView
const infraIdx = html.indexOf('window.loadInfrastructureView =');
console.log('=== 2. LOAD INFRASTRUCTURE VIEW ===');
if (infraIdx !== -1) {
  console.log(html.slice(infraIdx, infraIdx + 2000));
}

// 3. Knowledge View: window.loadKnowledgeView
const knowIdx = html.indexOf('window.loadKnowledgeView =');
console.log('=== 3. LOAD KNOWLEDGE VIEW ===');
if (knowIdx !== -1) {
  console.log(html.slice(knowIdx, knowIdx + 2000));
}

// 4. IDE View: window.loadIdeView
const ideIdx = html.indexOf('window.loadIdeView =');
console.log('=== 4. LOAD IDE VIEW ===');
if (ideIdx !== -1) {
  console.log(html.slice(ideIdx, ideIdx + 2000));
}

// 5. Terminal View: window.loadTerminalView
const termIdx = html.indexOf('window.loadTerminalView =');
console.log('=== 5. LOAD TERMINAL VIEW ===');
if (termIdx !== -1) {
  console.log(html.slice(termIdx, termIdx + 2000));
}
