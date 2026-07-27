const TOKEN = localStorage.getItem('grg_token');
if (!TOKEN) location.href = '/GRG-login';
const H = { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' };
const api = (p, opts = {}) => fetch(`/api${p}`, { headers: H, ...opts }).then((r) => { if (r.status === 401) location.href = '/GRG-login'; return r.json(); });

const healthClass = (h) => h == null ? '' : h >= 75 ? 'good' : h >= 50 ? 'mid' : 'bad';
let current = null;

async function loadBuildings() {
  const { office } = await api('/office');
  const wrap = document.getElementById('buildings');
  const empty = document.getElementById('empty');
  if (!office || !office.length) { empty.style.display = 'block'; wrap.innerHTML = ''; return; }
  empty.style.display = 'none';

  const buildings = await Promise.all(office.map((o) => api(`/projects/${o.projectId}/building`).catch(() => null)));
  wrap.innerHTML = buildings.filter(Boolean).map((b) => renderBuilding(b)).join('');
  document.querySelectorAll('.building').forEach((el) => el.addEventListener('click', () => openCompany(el.dataset.id)));
}

function renderBuilding(b) {
  const h = b.health ? b.health.score : null;
  const floorsHtml = b.floors.map((f, idx) => {
    const lit = Array.from({ length: 4 }, (_, i) => `<i class="${i < Math.min(4, f.employees.length + (f.floor === 0 ? 1 : 0)) ? 'lit' : ''}"></i>`).join('');
    const people = f.floor === 0
      ? `<div class="person"><div class="face">🏛️</div><div class="nm">Recepção</div></div>`
      : (f.employees.length
        ? f.employees.map((e) => `
          <div class="person ${e.role === 'dono' ? 'owner' : ''}">
            <div class="face">${e.emoji}</div>
            <div class="nm">${e.title.split('—')[0].split('(')[0].trim().slice(0, 14)}</div>
            <div class="st">${'★'.repeat(e.level || 1)}</div>
          </div>`).join('')
        : `<span class="vacant">— setor vazio —</span>`);
    return `
      <div class="floor ${f.floor === 0 ? 'ground' : ''}">
        <div class="win">${lit}</div>
        <div class="lvl">${f.floor === 0 ? 'TÉRREO' : f.floor + 'º ANDAR'}<b>${f.dept}</b></div>
        <div class="people">${people}</div>
      </div>`;
  }).join('');
  return `
    <div class="building" data-id="${b.projectId}">
      <div class="roof">
        <span class="co">🏢 ${b.company}</span>
        ${h != null ? `<span class="hp ${healthClass(h)}">saúde ${h}</span>` : '<span class="hp">—</span>'}
      </div>
      ${floorsHtml}
    </div>`;
}

async function openCompany(projectId) {
  current = projectId;
  const wf = await api(`/projects/${projectId}/workforce`);
  let advise = null;
  try { advise = await api(`/twins/${projectId}/advise`); } catch { /* sem twin */ }

  document.getElementById('m-store').textContent = wf.subjectName;
  document.getElementById('m-niche').textContent = wf.niche;
  const h = advise && advise.health ? advise.health.score : null;
  const hEl = document.getElementById('m-health');
  hEl.textContent = h != null ? `saúde ${h}/100` : 'sem análise de código';
  hEl.className = 'health ' + (h != null && h < 60 ? 'hp bad' : '');

  document.getElementById('m-staff').innerHTML = wf.employees.map((e) => `
    <li class="${e.role === 'dono' ? 'owner' : ''}"><span>${e.emoji}</span> ${e.title} <span class="lv">nv ${e.level}</span></li>`).join('');
  document.getElementById('m-role').innerHTML = wf.employees.map((e) => `<option value="${e.role}">${e.title}</option>`).join('');

  const log = document.getElementById('m-log');
  log.innerHTML = '';
  addMsg('sys', null, `Prédio de ${wf.subjectName} — ${wf.employees.length} agentes. Rode uma reunião ou fale com alguém.`);
  document.getElementById('modal').classList.remove('hidden');
}

function addMsg(kind, name, text) {
  const log = document.getElementById('m-log');
  const div = document.createElement('div');
  div.className = 'msg ' + (kind === 'you' ? 'you' : kind === 'sys' ? 'sys' : kind === 'owner' ? 'owner-msg' : 'staff-msg');
  div.innerHTML = (name ? `<div class="name">${name}</div>` : '') + String(text).replace(/</g, '&lt;');
  log.appendChild(div); log.scrollTop = log.scrollHeight;
}

document.getElementById('close').addEventListener('click', () => document.getElementById('modal').classList.add('hidden'));
document.getElementById('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') e.target.classList.add('hidden'); });

document.getElementById('btn-standup').addEventListener('click', async () => {
  addMsg('sys', null, '⏳ reunindo a equipe...');
  const r = await api(`/projects/${current}/standup`, { method: 'POST' });
  for (const t of r.turns) addMsg(t.role === 'dono' ? 'owner' : 'staff', `${t.title}`, t.text);
});

document.getElementById('btn-report').addEventListener('click', async () => {
  addMsg('sys', null, '⏳ o Diretor está montando o relatório...');
  const r = await api(`/projects/${current}/daily-report`, { method: 'POST' });
  addMsg('owner', '👔 Relatório do Diretor', r.narration || r.findings.join(' · '));
  if (r.recommendations) addMsg('owner', 'Recomendações', r.recommendations.map((x) => '• ' + x).join('\n'));
  loadBuildings();
});

document.getElementById('m-ask').addEventListener('submit', async (e) => {
  e.preventDefault();
  const role = document.getElementById('m-role').value;
  const q = document.getElementById('m-q').value.trim();
  if (!q) return;
  document.getElementById('m-q').value = '';
  addMsg('you', 'Você', q);
  addMsg('sys', null, '…');
  const r = await api(`/projects/${current}/ask`, { method: 'POST', body: JSON.stringify({ role, question: q }) });
  document.querySelector('.msg.sys:last-child')?.remove();
  addMsg('staff', `${r.employee.title}`, r.answer);
});

fetch('/health').then((r) => r.json()).then(() => { const el = document.getElementById('llmstatus'); el.textContent = 'sistema online'; el.classList.add('on'); }).catch(() => {});
loadBuildings();
setInterval(loadBuildings, 20000);
