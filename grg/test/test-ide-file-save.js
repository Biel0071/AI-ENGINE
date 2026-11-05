const assert = require('node:assert/strict');

async function testSave() {
  const loginRes = await fetch('http://127.0.0.1:4400/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'admin' })
  });
  const login = await loginRes.json();
  const headers = { 'Authorization': 'Bearer ' + login.token, 'Content-Type': 'application/json' };
  
  const readRes = await fetch('http://127.0.0.1:4400/api/fenix/projects/fenix-os/file?path=package.json', { headers });
  const fileData = await readRes.json();
  console.log('READ result:', { status: readRes.status, path: fileData.path, hash: fileData.hash });
  
  const saveRes = await fetch('http://127.0.0.1:4400/api/fenix/projects/fenix-os/file', {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      path: 'package.json',
      content: fileData.content,
      expectedHash: fileData.hash
    })
  });
  const saveResult = await saveRes.json();
  console.log('SAVE result:', { status: saveRes.status, saveResult });
  assert.equal(saveRes.status, 200);
  assert.equal(saveResult.ok, true);
  assert.equal(saveResult.memoryRecorded, true);
  console.log('VERIFICATION COMPLETE: Save succeeded with memoryRecorded: true!');
}

testSave().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
