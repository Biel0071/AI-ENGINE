async function main() {
  const url = 'http://127.0.0.1:4410/api/login';
  const payload = {
    tenantId: 'grg',
    userId: 'grg-admin',
    password: 'grg-admin',
    rememberMe: true
  };
  const t0 = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const elapsed = Date.now() - t0;
  console.log('HTTP Status:', res.status, res.statusText);
  console.log('Response Time:', elapsed, 'ms');
  console.log('Set-Cookie Header:', res.headers.get('set-cookie'));
  const data = await res.json();
  console.log('Response Body:', data);
  if (res.status === 200 && data.token) {
    console.log('LOGIN SUCCESS! Token generated successfully.');
  } else {
    console.error('LOGIN FAILED!');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fetch error:', err.message);
  process.exit(1);
});
