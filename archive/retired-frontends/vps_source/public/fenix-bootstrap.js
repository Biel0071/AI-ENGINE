/**
 * FENIX OS BOOTSTRAP v5
 * Motor canônico `window.FENIX` + Live Runtime WebSocket
 */
window.FENIX = window.FENIX || {
  api: null,
  ws: null,
  live: null,
  state: { status: 'BOOTING', projects: [], jobs: [], missions: [], agents: [] },
  fs: null,
  git: null,
  terminal: null,
  visual: null
};

window.FENIX.api = async function api(path, options = {}, retried = false) {
  const token = localStorage.getItem('grg_token');
  // A sessão pode estar no cookie HttpOnly após reload. Não redirecionar
  // prematuramente só porque o Bearer não está no localStorage.
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  try {
    const res = await fetch(path, { ...options, credentials: 'same-origin', headers: { ...headers, ...options.headers } });
    if (res.status === 401 && !retried) {
      const success = await attemptRefresh();
      if (success) return window.FENIX.api(path, options, true);
      localStorage.removeItem('grg_token');
      location.href = '/GRG-login';
      return Promise.reject(new Error("Unauthorized"));
    }
    if (!res.ok) {
      const txt = await res.text();
      let err;
      try { err = JSON.parse(txt); } catch (e) { err = { error: txt }; }
      throw Object.assign(err, { status: res.status, endpoint: path });
    }
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (ex) {
    console.error(`[FENIX] Erro API (${path}):`, ex);
    throw ex;
  }
};

async function attemptRefresh() {
  const rt = sessionStorage.getItem('grg_refresh_token');
  if (!rt) return false;
  try {
    const config = await fetch('/api/oidc/config').then(r => r.json());
    if (!config || !config.enabled) return false;
    const body = new URLSearchParams({ grant_type: 'refresh_token', client_id: config.clientId, refresh_token: rt });
    const r = await fetch(config.tokenEndpoint, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
    if (r.ok) {
      const data = await r.json();
      if (data.access_token) {
        localStorage.setItem('grg_token', data.access_token);
        if (data.refresh_token) sessionStorage.setItem('grg_refresh_token', data.refresh_token);
        return true;
      }
    }
  } catch (e) { console.error('Refresh fail:', e); }
  return false;
}

async function bootFenix() {
  if (window.FENIX_BOOTING) return;
  window.FENIX_BOOTING = true;
  try {
    console.log('[FENIX] BOOT: Verificando backend...');
    // /health is intentionally public and is the authoritative liveness
    // signal. Do not label a healthy backend OFFLINE merely because the UI
    // session has no bearer token for protected overview routes.
    const publicHealth = await fetch('/health', { headers: { Accept: 'application/json' } })
      .then((r) => r.ok ? r.json() : null).catch(() => null);
    const status = (publicHealth?.ok || publicHealth?.status === 'ready') ? publicHealth
      : await window.FENIX.api('/api/v2/ai-platform/status').catch(() => null)
        || await window.FENIX.api('/overview').catch(() => null);
    if (status) {
      window.FENIX.state.status = 'ONLINE';
      console.log('[FENIX] BOOT: API ONLINE');
    } else {
      throw new Error("Backend não respondeu");
    }
  } catch (err) {
    console.error('[FENIX] Boot falhou:', err);
    window.FENIX.state.status = 'OFFLINE';
  } finally {
    window.FENIX_READY = true;
    console.log('[FENIX] INITIALIZATION COMPLETE.');

    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    if (dot && txt) {
      if (window.FENIX.state.status === 'ONLINE') {
        dot.style.color = 'var(--green)';
        txt.style.color = 'var(--green)';
        txt.textContent = 'CONNECTED';
      } else {
        dot.style.color = 'var(--rose)';
        txt.style.color = 'var(--rose)';
        txt.textContent = 'OFFLINE';
      }
    }

    // Load sequence: live-runtime PRIMEIRO (WS), depois UI
    const scripts = [
  '/runtime-cockpit.js?v=17',
      '/live-runtime.js?v=12',
      '/unified-app.js?v=command-confirmation-2',
      '/ide-enhancer.js?v=5',
      '/cockpit-app.js?v=3',
      '/visual-inspector.js?v=3',
      '/jobs-app.js?v=3',
      '/fenix-command-bridge.js?v=2'
    ];

    for (const src of scripts) {
      console.log('[FENIX] Loading:', src);
      await new Promise(resolve => {
        const id = `fenix-script-${src.split('?')[0].replace(/[^a-z0-9]+/gi, '-')}`;
        if (document.getElementById(id)) {
          resolve();
          return;
        }
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        const s = document.createElement('script');
        s.id = id;
        s.src = src;
        s.onload = done;
        s.onerror = done;
        document.body.appendChild(s);
        setTimeout(done, 8000);
      });
    }

    document.dispatchEvent(new Event('FENIX_READY'));
    window.FENIX_BOOTED = true;
    window.FENIX_BOOTING = false;
  }
}

if (!window.FENIX_BOOTED) bootFenix();

