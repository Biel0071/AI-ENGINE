const fs = require('fs');

async function testLogin() {
  const urls = ['http://209.50.241.22:4410/api/login', 'http://209.50.241.22:3000/api/login'];
  for (const url of urls) {
    console.log('Testing', url);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: '' })
      });
      const data = await res.json();
      console.log('Response:', res.status, data);
      if (data.token) {
        fs.writeFileSync('.session_token', data.token);
        console.log('Saved token to .session_token');
        return data.token;
      }
    } catch (err) {
      console.error('Error on', url, err.message);
    }
  }
}

testLogin();
