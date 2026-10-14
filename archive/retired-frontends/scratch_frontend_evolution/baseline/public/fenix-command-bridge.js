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
      input.value = '';
      if (typeof window.runChat === 'function') await window.runChat(objective);
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
