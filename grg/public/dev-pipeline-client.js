window.executeSmallTask = async function(prompt) {
  const div = document.createElement('div');
  div.className = 'chat-bubble bubble-sys';
  div.textContent = 'SMALL TASK · enviando 1 job ao Fênix...';
  document.getElementById('chatLog')?.appendChild(div);
  try {
    const res = await fetch('/api/dev/small-task', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + localStorage.getItem('grg_token') }, body: JSON.stringify({ prompt }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API returned ' + res.status);
    div.textContent = `SMALL TASK · 1 job · ${data.jobId} · ${data.status}`;
  } catch (error) { div.textContent = `SMALL TASK ERROR · ${error.message}`; }
};

window.executeDevPipeline = async function(prompt) {
  bubble(prompt, 'user');
  
  const loaderId = 'dev-pipe-' + Date.now();
  const div = document.createElement('div');
  div.id = loaderId;
  div.className = 'chat-bubble bubble-sys';
  div.innerHTML = '<span class="status-pill wait">RUNNING</span> Iniciando Missão DevPipeline Autônoma...';
  const chatFeed = document.getElementById('chatLog');
  if (chatFeed) {
    chatFeed.appendChild(div);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }
  
  try {
    const res = await fetch('/api/dev/pipeline', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + localStorage.getItem('grg_token')
      },
      // Browser-local paths are invalid inside the Linux FÊNIX container.
      body: JSON.stringify({ prompt, projectId: window.state?.activeProjectId || null })
    });
    
    if (!res.ok) throw new Error('API returned ' + res.status);
    const data = await res.json();
    
    const missionId = data.mission?.missionId;
    const card = document.getElementById(loaderId);
    if (!missionId) throw new Error('API não retornou missionId');
    const startedAt = Date.now();
    const token = localStorage.getItem('grg_token');
    const terminal = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED']);
    const stage = (step) => step?.status === 'DISPATCHED' ? (step.jobType || 'EXECUTING') : (step?.status || 'PLANNED');
    for (let attempt = 0; attempt < 300; attempt += 1) {
      const response = await fetch('/api/fenix/missions/' + encodeURIComponent(missionId), {
        headers: token ? { authorization: 'Bearer ' + token } : {}, cache: 'no-store',
      });
      if (!response.ok) throw new Error('API returned ' + response.status);
      const mission = await response.json();
      const current = mission.steps?.find((step) => ['DISPATCHED', 'RUNNING'].includes(step.status)) || mission.steps?.find((step) => step.status === 'PLANNED');
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      const completed = mission.steps?.filter((step) => step.status === 'SUCCEEDED').length || 0;
      const total = mission.steps?.length || 0;
      const displayedStage = terminal.has(mission.status) ? (mission.status === 'SUCCEEDED' ? 'VALIDATED' : mission.status) : stage(current);
      card.innerHTML = '<span class="status-pill ' + (terminal.has(mission.status) ? (mission.status === 'SUCCEEDED' ? 'ok' : 'err') : 'wait') + '">' + mission.status + '</span> Missão ' + missionId + ' · ' + completed + '/' + total + ' jobs · ' + (mission.progress || 0) + '% · ' + elapsed + 's · ' + displayedStage;
      window.dispatchEvent(new CustomEvent('fenix:data', { detail: { source: 'dev-pipeline', missionId, status: mission.status } }));
      if (terminal.has(mission.status)) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch(e) {
    document.getElementById(loaderId).innerHTML = '<span class="status-pill err">ERROR</span> Falha ao iniciar pipeline: ' + e.message;
  }
};
