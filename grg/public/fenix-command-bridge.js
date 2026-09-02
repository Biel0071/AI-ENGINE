(function () {
  function bindCommandCenter() {
    const form = document.getElementById('masterCmdForm');
    const input = document.getElementById('masterPrompt');
    if (!form || !input || form.dataset.fenixCommandBound) return;
    form.dataset.fenixCommandBound = 'true';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const objective = String(input.value || '').trim();
      if (!objective) return;
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      try {
        const token = localStorage.getItem('grg_token');
        const response = await fetch('/api/fenix/missions', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ title: objective, objective, source: 'fenix-command-center' }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
        input.value = '';
        const status = document.createElement('div');
        status.className = 'chat-bubble bubble-sys';
        status.textContent = `MISSION QUEUED · ${result.missionId || result.id || 'unknown'}`;
        form.parentElement.appendChild(status);
      } catch (error) {
        const status = document.createElement('div');
        status.className = 'chat-bubble bubble-sys';
        status.textContent = `MISSION ERROR · ${error.message}`;
        form.parentElement.appendChild(status);
      } finally {
        if (button) button.disabled = false;
      }
    });
  }
  function bindNavigation() {
    document.querySelectorAll('.nav-item[data-view]').forEach((button) => {
      if (button.dataset.fenixNavigationBound) return;
      button.dataset.fenixNavigationBound = 'true';
      button.addEventListener('click', () => {
        const view = button.dataset.view;
        document.querySelectorAll('.nav-item[data-view]').forEach((item) => item.classList.toggle('active', item === button));
        document.querySelectorAll('.view').forEach((panel) => { panel.style.display = panel.id === `view-${view}` ? 'flex' : 'none'; });
        window.history.replaceState({}, '', `${window.location.pathname}#${view}`);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindCommandCenter);
  else bindCommandCenter();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindNavigation);
  else bindNavigation();
  window.addEventListener('FENIX_READY', bindCommandCenter);
  window.addEventListener('FENIX_READY', bindNavigation);
})();
