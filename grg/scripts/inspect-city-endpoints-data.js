const http = require('http');

function fetchJson(url) {
  return new Promise(resolve => {
    http.get(url, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { resolve(d); }
      });
    }).on('error', e => resolve({ error: e.message }));
  });
}

async function run() {
  const cityState = await fetchJson('http://127.0.0.1:3000/api/v2/city/state');
  console.log('=== /api/v2/city/state ===');
  console.log(JSON.stringify(cityState, null, 2).slice(0, 1000));

  const livingCityState = await fetchJson('http://127.0.0.1:3000/api/v2/living-city/state');
  console.log('=== /api/v2/living-city/state ===');
  console.log(JSON.stringify(livingCityState, null, 2).slice(0, 1000));

  const agents = await fetchJson('http://127.0.0.1:3000/api/v2/living-city/agents');
  console.log('=== /api/v2/living-city/agents ===');
  console.log(`total: ${agents.total}, agents length: ${agents.agents?.length}`);
  console.log('first agent:', JSON.stringify(agents.agents?.[0], null, 2));
}

run();
