const http = require('http');

module.exports = {
  initialize() { console.log('[FENIX API Plugin] Initialize'); return true; },
  health() { return { status: 'healthy', latency: 25 }; },
  capabilities() { return ['Chat', 'Reasoning', 'Embeddings', 'Vision', 'Planning', 'Summaries', 'Filesystem']; },
  async execute(action, payload) {
    console.log('[FENIX API Plugin] Executing: ' + action);
    
    return new Promise((resolve, reject) => {
      // Direct integration with the user's .215 Gateway
      const data = JSON.stringify({ action, payload });
      const req = http.request({
        hostname: '209.50.241.215',
        port: 4400,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      }, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
             resolve({ success: true, action, payload: JSON.parse(responseData) });
          } catch(e) {
             resolve({ success: true, action, payload: responseData });
          }
        });
      });
      
      req.on('error', (e) => {
        console.error('[FENIX API Plugin] Gateway Error:', e.message);
        reject(e);
      });
      
      req.write(data);
      req.end();
    });
  },
  metrics() { return { cpu: 1, ram: 10, tokens: 150 }; },
  shutdown() { console.log('[FENIX API Plugin] Shutdown'); return true; },
  permissions() { return ['network']; },
  version() { return '1.0.0'; },
  heartbeat() { return Date.now(); }
};
