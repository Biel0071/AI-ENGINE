'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.resolve(__dirname, '../public');
const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const sidebar = fs.readFileSync(path.join(publicDir, 'fenix-mascot-sidebar.js'), 'utf8');
const footerStart = html.indexOf('<footer class="fenix-presentation-footer"');
const footerEnd = html.indexOf('</footer>', footerStart);
const footer = html.slice(footerStart, footerEnd);

test('system ticker only displays host and service values from the live API', () => {
  assert.doesNotMatch(footer, /209\.50\.241\.22|ONLINE\s*\(:3001\)|PORTA 8081 ATIVA|Qwen 2\.5 \+ DeepSeek R1|MEMÓRIA SINCRONIZADA/);
  assert.match(footer, /id="tickerHost"/);
  assert.match(footer, /id="tickerFastLane"/);
  assert.match(footer, /id="tickerFastLane2"/);
  assert.match(sidebar, /setDOMText\('tickerFastLane',\s*apiPlatform\)/);
  assert.match(sidebar, /setDOMText\('tickerFastLane2',\s*apiPlatform\)/);
});
