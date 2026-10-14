const BASE = 'http://localhost:4400';

async function testLocal() {
  console.log('Logging in...');
  const loginRes = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Logged in successfully, token:', token ? token.slice(0, 10) + '...' : 'NONE');

  console.log('Testing /api/v2/vps-chat...');
  const t0 = Date.now();
  const chatRes = await fetch(`${BASE}/api/v2/vps-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      'Cookie': 'token=' + token
    },
    body: JSON.stringify({ prompt: 'Fenix, confirme seu status na VPS.' })
  });
  console.log('Chat status:', chatRes.status, `(${Date.now() - t0}ms)`);
  const chatData = await chatRes.json();
  console.log('Chat response:', JSON.stringify(chatData, null, 2));
}

testLocal().catch(console.error);
