document.addEventListener('DOMContentLoaded', () => {
  const valSystem = document.getElementById('val-system');
  const subSystem = document.getElementById('sub-system');
  const valMission = document.getElementById('val-mission');
  const subMission = document.getElementById('sub-mission');
  const valProblems = document.getElementById('val-problems');
  const subProblems = document.getElementById('sub-problems');
  const valAction = document.getElementById('val-action');
  const btnRun = document.getElementById('btn-run');
  const chatOutput = document.getElementById('chat-output');
  const chatInput = document.getElementById('chat-input');
  const btnSend = document.getElementById('btn-send');

  async function loadDashboard() {
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Card 1: Sistema
      valSystem.textContent = data.system.status || 'Online';
      subSystem.textContent = `Uptime: ${data.system.uptime || '1 min'} | Workers: ${data.system.workersActive || 11} ativos`;

      // Card 2: Missão
      valMission.textContent = data.mission.title || 'Estabilizar Runtime';
      subMission.textContent = `Objetivo: ${data.mission.objective || 'Manter 100% de testes'}`;

      // Card 3: Problemas
      valProblems.textContent = `${data.problems.count} Alerta(s)`;
      subProblems.textContent = data.problems.items[0] || 'Ambiente limpo';

      // Card 4: Executar Ação
      valAction.textContent = `Próximo Passo: ${data.nextAction.description || 'Pronto para deploy'}`;

    } catch (err) {
      valSystem.textContent = 'Offline';
      subSystem.textContent = 'Erro ao conectar no servidor FÊNIX';
    }
  }

  async function sendMessage(msgText) {
    if (!msgText.trim()) return;

    chatOutput.innerHTML += `\n> Você: ${msgText}`;
    chatOutput.scrollTop = chatOutput.scrollHeight;
    chatInput.value = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgText })
      });
      const data = await res.json();
      chatOutput.innerHTML += `\n⚡ FÊNIX: ${data.response || 'Missão executada.'}`;
    } catch (err) {
      chatOutput.innerHTML += `\n❌ Erro ao enviar mensagem para o Supervisor.`;
    }
    chatOutput.scrollTop = chatOutput.scrollHeight;
  }

  btnRun.addEventListener('click', () => {
    sendMessage('executar missão ativa');
  });

  btnSend.addEventListener('click', () => {
    sendMessage(chatInput.value);
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendMessage(chatInput.value);
    }
  });

  // Carrega ao iniciar e atualiza a cada 10 segundos
  loadDashboard();
  setInterval(loadDashboard, 10000);
});
