const fs = require('fs');
fetch('http://127.0.0.1:4400/api/dev/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' },
  body: JSON.stringify({ projectId: 'daemon-test', prompt: 'Faça uma melhoria pequena e segura neste projeto.', client: 'Playwright' })
});
