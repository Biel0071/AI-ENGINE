window.executeDevPipeline = async function(prompt) {
  bubble(prompt, 'user');
  
  const loaderId = 'dev-pipe-' + Date.now();
  const div = document.createElement('div');
  div.id = loaderId;
  div.className = 'chat-bubble bubble-sys';
  div.innerHTML = '<span class="status-pill wait">RUNNING</span> Iniciando Missão DevPipeline Autônoma...';
  chatFeed.appendChild(div);
  chatFeed.scrollTop = chatFeed.scrollHeight;
  
  try {
    const res = await fetch('/api/dev/pipeline', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + localStorage.getItem('grg_token')
      },
      body: JSON.stringify({ prompt, projectPath: window.state?.activeProjectId || null })
    });
    
    if (!res.ok) throw new Error('API returned ' + res.status);
    const data = await res.json();
    
    document.getElementById(loaderId).innerHTML = '<span class="status-pill ok">DELEGATED</span> Missão ' + data.mission?.missionId + ' delegada ao Agent Swarm.';
  } catch(e) {
    document.getElementById(loaderId).innerHTML = '<span class="status-pill err">ERROR</span> Falha ao iniciar pipeline: ' + e.message;
  }
};
