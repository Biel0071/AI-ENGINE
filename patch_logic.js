const fs = require('fs');

let js = fs.readFileSync('grg/public/unified-app.js', 'utf8');

const jsInject = `
  // --- DEV COMMAND CENTER UI TAB ---
  const cockpitBtn = document.querySelector('button[data-view="cockpit"]');
  if (cockpitBtn) {
    cockpitBtn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
        view.style.display = 'none';
      });
      cockpitBtn.classList.add('active');
      const cockpitView = document.getElementById('view-cockpit');
      cockpitView.classList.add('active');
      cockpitView.style.display = 'flex';
    });
  }

  // --- DEV COMMAND CENTER LOGIC ---
  const cockpitExecuteBtn = document.getElementById('cockpitExecuteBtn');
  const cockpitPrompt = document.getElementById('cockpitPrompt');
  const cockpitProjectId = document.getElementById('cockpitProjectId');
  const cockpitMissionJobs = document.getElementById('cockpitMissionJobs');
  const cockpitLogs = document.getElementById('cockpitLogs');
  const cockpitStatus = document.getElementById('cockpitStatus');

  if (cockpitExecuteBtn) {
    cockpitExecuteBtn.addEventListener('click', async () => {
      const prompt = cockpitPrompt.value.trim();
      const projectId = cockpitProjectId.value.trim();
      if (!prompt || !projectId) return;

      cockpitStatus.textContent = 'EXECUTING...';
      cockpitStatus.style.color = 'var(--accent)';
      
      try {
        const res = await fetch('/api/dev/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('grg_token') || 'test-token') },
          body: JSON.stringify({ projectId, prompt, client: 'FenixCockpit' })
        });
        
        if (!res.ok) throw new Error('API Error ' + res.status);
        const data = await res.json();
        
        cockpitMissionJobs.innerHTML = \`<div style="padding:10px; background:#111; border-radius:4px; margin-bottom:8px;">
          <div style="font-weight:bold; margin-bottom:4px; color:var(--accent);">MISSION: \${data.job.missionId}</div>
          <div style="font-size:11px; color:var(--text-muted);">Root Job: \${data.job.id}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">STATUS: <span style="color:var(--yellow);">\${data.job.status}</span></div>
        </div>\`;
        
        cockpitLogs.innerHTML += \`\\n> [\${new Date().toLocaleTimeString()}] Mission initiated: \${data.job.missionId}\\n\`;
        cockpitPrompt.value = '';
      } catch (err) {
        cockpitStatus.textContent = 'ERROR';
        cockpitStatus.style.color = 'var(--red)';
        cockpitLogs.innerHTML += \`\\n> [\${new Date().toLocaleTimeString()}] ERROR: \${err.message}\\n\`;
      }
    });
  }

  // Hook WebSocket for pipeline updates to Cockpit
  window.addEventListener('fenix_ws_message', (e) => {
    const msg = e.detail;
    if (!cockpitLogs) return;

    if (msg.type === 'dev:pipeline:stage' || msg.type === 'dev:pipeline:completed' || msg.type === 'dev:pipeline:failed') {
      const time = new Date().toLocaleTimeString();
      let logLine = \`> [\${time}] \${msg.type}: \${msg.stage || msg.status} (Job \${msg.jobId})\`;
      if (msg.data) {
        logLine += \` - \${JSON.stringify(msg.data).slice(0, 100)}...\`;
      }
      cockpitLogs.innerHTML += \`\\n\${logLine}\`;
      cockpitLogs.scrollTop = cockpitLogs.scrollHeight;
    }
  });
`;

js += '\n\n' + jsInject;
fs.writeFileSync('grg/public/unified-app.js', js, 'utf8');
console.log('JS Patched!');
