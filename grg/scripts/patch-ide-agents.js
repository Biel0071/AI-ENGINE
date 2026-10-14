const fs = require('fs');

const file = '/opt/fenix-os/public/index.html';
let html = fs.readFileSync(file, 'utf8');

const oldCode = `    if (liveAgentsList && window.__fenixRealityData?.dynamicWorkforce?.agents) {
      const agents = window.__fenixRealityData.dynamicWorkforce.agents.slice(0, 5);
      liveAgentsList.innerHTML = agents.map(a => \`
        <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04); font-size:11px;">
          <span>\${a.avatar || '🤖'} <b>\${a.name}</b></span>
          <span style="color:#10b981;">● \${a.status}</span>
        </div>
      \`).join('');
    }`;

const newCode = `    if (liveAgentsList) {
      fetch('/api/v2/living-city/agents').then(r => r.json()).then(d => {
        const agents = (d.agents || []).slice(0, 6);
        if (agents.length > 0) {
          liveAgentsList.innerHTML = agents.map(a => \`
            <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04); font-size:11px;">
              <span>\${a.avatar || a.emoji || '🤖'} <b>\${a.name}</b></span>
              <span style="color:\${a.status === 'ONLINE' ? '#10b981' : '#38bdf8'};">● \${a.status || 'ONLINE'}</span>
            </div>
          \`).join('');
        }
      }).catch(() => {});
    }`;

if (html.includes(oldCode)) {
  html = html.replace(oldCode, newCode);
  fs.writeFileSync(file, html, 'utf8');
  console.log('Successfully enhanced liveAgentsList in IDE View!');
} else {
  console.log('Target code not found or already patched.');
}
