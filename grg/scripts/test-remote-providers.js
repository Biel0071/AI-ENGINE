async function test() {
  const loginPayload = JSON.stringify({
    tenantId: 'grg',
    userId: 'grg-admin',
    password: 'grg-admin',
    rememberMe: true
  });

  const loginRes = await fetch('http://127.0.0.1:4410/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: loginPayload
  });

  const login = await loginRes.json();
  console.log('Login status:', loginRes.status, 'Token exists:', Boolean(login.token));

  const provRes = await fetch('http://127.0.0.1:4410/api/v2/providers', {
    headers: { Authorization: `Bearer ${login.token}` }
  });

  console.log('Providers HTTP status:', provRes.status);
  const provData = await provRes.json();
  console.log('Providers response ok:', provData.ok);
  console.log('Providers count:', provData.providers ? provData.providers.length : 0);

  // Test provider ping
  const pingRes = await fetch('http://127.0.0.1:4410/api/v2/providers/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${login.token}`
    },
    body: JSON.stringify({ providerId: 'api-platform' })
  });
  console.log('Ping api-platform status:', pingRes.status);
  const pingData = await pingRes.json();
  console.log('Ping result:', pingData);
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
