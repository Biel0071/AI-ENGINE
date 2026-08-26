'use strict';

const state = { clients: [], query: '', status: 'all' };

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

async function loadClients() {
  const response = await fetch('/api/clients');
  if (!response.ok) throw new Error('Falha ao carregar clientes');
  const data = await response.json();
  state.clients = data.clients || [];
  render();
}

function visibleClients() {
  const q = state.query.trim().toLowerCase();
  return state.clients.filter((client) => {
    const matchesText = !q || [client.name, client.segment, client.owner].some((value) => String(value).toLowerCase().includes(q));
    const matchesStatus = state.status === 'all' || client.status === state.status;
    return matchesText && matchesStatus;
  });
}

function render() {
  const clients = visibleClients();
  document.getElementById('totalClients').textContent = String(clients.length);
  document.getElementById('clientGrid').innerHTML = clients.map((client) => `
    <article class="client-card" data-source="public/app.js" data-client-id="${client.id}">
      <header>
        <div>
          <h2>${escapeHtml(client.name)}</h2>
          <p>${escapeHtml(client.segment)} / ${escapeHtml(client.owner)}</p>
        </div>
        <span class="badge ${escapeHtml(client.status).toLowerCase()}">${escapeHtml(client.status)}</span>
      </header>
      <div class="metric-row">
        <span>MRR<br><strong>${money.format(client.mrr || 0)}</strong></span>
        <span>Health<br><strong>${client.health}%</strong></span>
      </div>
      <div class="health" aria-label="Health ${client.health}%"><span style="width:${Number(client.health || 0)}%"></span></div>
    </article>`).join('');
}

async function addClient(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  data.mrr = Number(data.mrr || 0);
  const response = await fetch('/api/clients', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Falha ao criar cliente');
  form.reset();
  await loadClients();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

document.getElementById('clientSearch').addEventListener('input', (event) => {
  state.query = event.target.value;
  render();
});
document.getElementById('statusFilter').addEventListener('change', (event) => {
  state.status = event.target.value;
  render();
});
document.getElementById('clientForm').addEventListener('submit', (event) => {
  event.preventDefault();
  addClient(event.currentTarget).catch((error) => alert(error.message));
});

loadClients().catch((error) => {
  document.getElementById('clientGrid').innerHTML = '<p data-source="public/app.js">' + escapeHtml(error.message) + '</p>';
});
