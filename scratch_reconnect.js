const fs = require('fs');
let code = fs.readFileSync('grg/public/ide-enhancer.js', 'utf8');

const reconnectCode = \
  ws.onclose = () => {
    console.log('[FÊNIX OS] WebSocket disconnected. Attempting to reconnect in 3s...');
    setTimeout(initWebSocket, 3000);
  };
\;

if (!code.includes('ws.onclose')) {
  code = code.replace('ws.onmessage = (event) => {', reconnectCode + '\n  ws.onmessage = (event) => {');
  fs.writeFileSync('grg/public/ide-enhancer.js', code, 'utf8');
  console.log('WebSocket reconnect logic added.');
} else {
  console.log('Already has reconnect logic.');
}

