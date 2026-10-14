function runWhenReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

runWhenReady(() => {
  const jobsView = document.getElementById('view-jobs');
  const jobsList = document.getElementById('jobsListContainer');
  
  if (!jobsView || !jobsList) return;

  async function fetchJobs() {
    try {
      const res = await fetch('/api/dev/jobs');
      const data = await res.json();
      renderJobs(data.jobs || []);
    } catch (e) {
      console.error('Failed to fetch jobs', e);
    }
  }

  function renderJobs(jobs) {
    jobsList.innerHTML = '';
    jobs.reverse().forEach(job => {
      const el = document.createElement('div');
      el.className = 'agent-card'; // Reuse agent card styling for consistency
      el.style.marginBottom = '10px';
      el.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
          <strong>ID: ${job.id || job.projectId}</strong>
          <span style="color:var(--accent); font-size:12px;">${job.status}</span>
        </div>
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:5px;">
          <div>Mission: ${job.missionId || 'N/A'} | Stage: ${job.stage || 'N/A'}</div>
          <div>Prompt: ${job.prompt ? job.prompt.substring(0, 50) + '...' : 'N/A'}</div>
        </div>
        <div style="display:flex; justify-content:flex-end;">
          <button class="grg-btn primary" onclick="cancelJob('${job.id}')" ${job.status !== 'RUNNING' && job.status !== 'QUEUED' ? 'disabled' : ''}>Cancel</button>
        </div>
      `;
      jobsList.appendChild(el);
    });
  }

  window.cancelJob = async (id) => {
    try {
      await fetch(`/api/dev/jobs/${id}/cancel`, { method: 'POST' });
      fetchJobs();
    } catch(e) {}
  };

  const jobsBtn = document.querySelector('button[data-view="jobs"]');
  if (jobsBtn) {
    jobsBtn.addEventListener('click', () => {
      fetchJobs();
    });
  }

  // Real-time updates
  window.addEventListener('fenix_ws_message', (e) => {
    if (jobsView.style.display !== 'none') {
      fetchJobs(); // Simple reload on any event
    }
  });
});
