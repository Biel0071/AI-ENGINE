fetch('http://127.0.0.1:4400/api/dev/pipeline', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test'
  },
  body: JSON.stringify({ prompt: 'teste' })
}).then(res => res.json()).then(console.log).catch(console.error);
