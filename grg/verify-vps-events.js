const { WebSocket } = require('ws');

(async () => {
  const token = '0dd60749b604e8f8857e910d651414648e98c922496af3a1ab4b6f99288ef8c7';
  
  // Use port 3000 because it is the public reverse proxy/gateway
  const WS_URL = 'ws://209.50.241.22:3000/events?token=' + token;
  const API_URL = 'http://209.50.241.22:3000/api';
  
  console.log('Connecting to Fênix OS VPS WebSocket Stream at', WS_URL);
  
  const ws = new WebSocket(WS_URL);
  let gotEvent = false;
  
  ws.on('open', () => {
    console.log('✅ WebSocket Connection Opened! Listening for activities...');
    ws.send(JSON.stringify({ type: 'heartbeat' }));
  });
  
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log('🔵 EVENT:', msg.type, '|', msg.event || msg.status || msg.message || '');
      gotEvent = true;
    } catch(err) {
      console.log('RAW EVENT:', data.toString());
    }
  });
  
  ws.on('error', (e) => {
    console.log('❌ WS Error:', e.message);
  });

  // Trigger a mission
  setTimeout(async () => {
    console.log('\n[Trigger] Dispatching mission to VPS via port 3000...');
    try {
      const response = await fetch(`${API_URL}/missions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          title: "VPS Frontend/Activity Validation",
          objective: "Verify VPS WebSocket event streams and execution over gateway",
          steps: [{ key: "verify_vps", type: "audit" }],
          autoApprove: true
        })
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Mission created:', data.id);
        const start = await fetch(`${API_URL}/missions/${data.id}/start`, {
           method: 'POST',
           headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Mission start signal sent:', start.status);
      } else {
        console.log('Failed to create mission:', response.status);
        const txt = await response.text();
        console.log('Response body:', txt.substring(0, 500));
      }
    } catch (err) {
      console.log('Fetch error:', err.message);
    }
  }, 2000);

  // Close after 12s
  setTimeout(() => {
    console.log('\nClosing connection. Test complete.');
    console.log('Did receive events?', gotEvent);
    ws.close();
    process.exit(0);
  }, 12000);
})();
