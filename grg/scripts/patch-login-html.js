const fs = require('fs');
const path = require('path');

const loginPath = path.join(__dirname, '../public/login.html');
const newContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GRG Serviços — Login</title>
  <style>
    :root { --bg:#0a0f1c; --card:#111a2e; --line:#23304d; --fg:#e6edf7; --muted:#8ea3c0; --gold:#d4a72c; --primary:#3b82f6; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; background: radial-gradient(1200px 600px at 50% -10%, #16233d, var(--bg)); color:var(--fg); font:15px/1.5 Inter,system-ui,sans-serif; display:grid; place-items:center; }
    .card { width:min(400px,92vw); background:var(--card); border:1px solid var(--line); border-radius:18px; padding:34px; box-shadow:0 30px 60px rgba(0,0,0,.5); }
    .brand { text-align:center; margin-bottom:24px; }
    .logo { display:inline-block; background:linear-gradient(135deg,#d4a72c,#b8860b); color:#1a1a1a; font-weight:900; font-size:26px; padding:10px 16px; border-radius:12px; letter-spacing:1px; }
    .brand h1 { margin:14px 0 2px; font-size:20px; letter-spacing:1px; }
    .brand p { margin:0; color:var(--muted); font-size:13px; }
    label { display:block; font-size:12px; color:var(--muted); margin:14px 0 6px; text-transform:uppercase; letter-spacing:.04em; }
    input[type="text"], input[type="password"] { width:100%; background:#0b1428; border:1px solid var(--line); color:var(--fg); padding:12px 14px; border-radius:10px; font-size:15px; }
    input:focus { outline:none; border-color:var(--gold); }
    button { width:100%; margin-top:22px; background:linear-gradient(135deg,var(--primary),#2563eb); color:#fff; border:0; padding:13px; border-radius:10px; font-weight:700; font-size:15px; cursor:pointer; }
    button:hover { filter:brightness(1.08); }
    .err { color:#fca5a5; font-size:13px; margin-top:14px; min-height:18px; text-align:center; }
    .hint { margin-top:18px; text-align:center; color:var(--muted); font-size:12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <span class="logo">GRG</span>
      <h1>GRG SERVIÇOS</h1>
      <p>Virtual Office AI — acesso ao escritório</p>
    </div>
    <form id="f" method="POST" action="/api/login" autocomplete="on">
      <label for="user">Usuário</label>
      <input id="user" name="username" type="text" placeholder="grg-admin" autocomplete="username" required />
      <label for="pw">Senha</label>
      <div style="position:relative">
        <input id="pw" name="password" type="password" placeholder="••••••••" autocomplete="current-password" required style="padding-right:40px;" />
        <span id="togglePw" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:16px; user-select:none; filter:grayscale(1) brightness(1.5);">👁️</span>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; margin-top:14px; margin-bottom:4px;">
        <label for="rememberMe" style="display:inline-flex; align-items:center; gap:8px; cursor:pointer; margin:0; text-transform:none; font-size:13px; color:var(--muted); letter-spacing:normal; user-select:none;">
          <input type="checkbox" id="rememberMe" name="remember" checked style="width:16px; height:16px; margin:0; accent-color:var(--primary); cursor:pointer;" />
          <span>Manter conectado</span>
        </label>
      </div>
      <button type="submit" id="loginButton">Entrar no escritório</button>
      <div class="err" id="err"></div>
    </form>
    <div class="hint">Sistema Operacional Empresarial Inteligente</div>
  </div>
  <script>
    const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
    const oidcConfig = fetch('/api/oidc/config').then(r => r.json()).catch(() => ({ enabled:false }));
    const storeTokens = (tokens) => { localStorage.setItem('grg_token', tokens.access_token); if (tokens.refresh_token) sessionStorage.setItem('grg_refresh_token', tokens.refresh_token); };
    async function continueExistingSession() {
      const token = localStorage.getItem('grg_token') || sessionStorage.getItem('grg_token');
      const headers = {};
      if (token) headers['authorization'] = \`Bearer \${token}\`;
      try {
        const current = await fetch('/api/me', { headers, credentials: 'include' });
        if (current.ok) {
          const returnRoute = sessionStorage.getItem('fenix_return_route') || '#command';
          sessionStorage.removeItem('fenix_return_route');
          location.replace('/app' + (returnRoute.startsWith('/') ? returnRoute : (returnRoute.startsWith('#') ? returnRoute : '#' + returnRoute)));
          return true;
        }
      } catch (_) {}
      const refreshToken = sessionStorage.getItem('grg_refresh_token');
      if (refreshToken) {
        try {
          const config = await oidcConfig;
          const body = new URLSearchParams({ grant_type:'refresh_token', client_id:config.clientId, refresh_token:refreshToken });
          const response = await fetch(config.tokenEndpoint, { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body });
          const tokens = await response.json();
          if (response.ok && tokens.access_token) {
            storeTokens(tokens);
            location.replace('/app' + (sessionStorage.getItem('fenix_return_route') || '#command'));
            return true;
          }
        } catch (_) {}
      }
      localStorage.removeItem('grg_token');
      localStorage.removeItem('grg_user');
      sessionStorage.removeItem('grg_refresh_token');
      return false;
    }
    function cleanOidcState() {
      sessionStorage.removeItem('oidc_state');
      sessionStorage.removeItem('oidc_verifier');
      localStorage.removeItem('grg_token');
      localStorage.removeItem('grg_user');
      sessionStorage.removeItem('grg_refresh_token');
    }
    function showLoginError(message) {
      const err = document.getElementById('err');
      err.textContent = message;
      document.getElementById('loginButton').textContent = 'Tentar entrar novamente';
      cleanOidcState();
      history.replaceState({}, document.title, '/GRG-login');
    }
    async function finishOidc() {
      const query = new URLSearchParams(location.search); if (!query.get('code')) return false;
      const config = await oidcConfig; const state = sessionStorage.getItem('oidc_state'); const verifier = sessionStorage.getItem('oidc_verifier');
      if (!state || state !== query.get('state') || !verifier) throw new Error('Sessão de login expirada. Clique novamente para entrar.');
      const body = new URLSearchParams({ grant_type:'authorization_code', client_id:config.clientId, code:query.get('code'), redirect_uri:config.redirectUri, code_verifier:verifier });
      const response = await fetch(config.tokenEndpoint, { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body }); const tokens = await response.json();
      if (!response.ok || !tokens.access_token) throw new Error(tokens.error_description || 'Falha OIDC');
      storeTokens(tokens); sessionStorage.removeItem('oidc_state'); sessionStorage.removeItem('oidc_verifier'); location.replace('/app' + (sessionStorage.getItem('fenix_return_route') || '#command')); return true;
    }
    if (new URLSearchParams(location.search).get('code')) {
      finishOidc().catch(error => showLoginError(error.message));
    } else if (!new URLSearchParams(location.search).has('force')) {
      continueExistingSession().catch(() => { localStorage.removeItem('grg_token'); sessionStorage.removeItem('grg_refresh_token'); });
    }
    oidcConfig.then(config => { if (config.enabled && window.crypto && crypto.subtle) { document.querySelectorAll('label,input').forEach(element => { element.style.display='none'; if (element.matches('input')) element.disabled=true; }); document.getElementById('loginButton').textContent='Entrar com identidade GRG'; } });
    document.getElementById('f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('err'); err.textContent = '';
      const config = await oidcConfig;
      if (config.enabled && window.crypto && crypto.subtle) { const verifier=b64url(crypto.getRandomValues(new Uint8Array(32))); const challenge=b64url(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))); const state=b64url(crypto.getRandomValues(new Uint8Array(24))); sessionStorage.setItem('oidc_verifier',verifier); sessionStorage.setItem('oidc_state',state); const auth=new URL(config.authorizationEndpoint,location.origin); auth.search=new URLSearchParams({ response_type:'code', client_id:config.clientId, redirect_uri:config.redirectUri, scope:config.scope, state, code_challenge:challenge, code_challenge_method:'S256' }); location.href=auth; return; }
      const userId = document.getElementById('user').value.trim();
      const password = document.getElementById('pw').value;
      const rememberMe = document.getElementById('rememberMe') ? document.getElementById('rememberMe').checked : true;
      try {
        const r = await fetch('/api/login', {
          method:'POST',
          headers:{'content-type':'application/json'},
          body: JSON.stringify({ tenantId:'grg', userId, password, rememberMe })
        });
        const data = await r.json();
        if (!r.ok) { err.textContent = data.error || 'Falha no login'; return; }
        if (rememberMe) {
          localStorage.setItem('grg_remember', '1');
          localStorage.setItem('grg_token', data.token);
          localStorage.setItem('grg_user', data.name || userId);
        } else {
          localStorage.removeItem('grg_remember');
          sessionStorage.setItem('grg_token', data.token);
          sessionStorage.setItem('grg_user', data.name || userId);
        }
        if (window.PasswordCredential && navigator.credentials && navigator.credentials.store) {
          try {
            const cred = new PasswordCredential(document.getElementById('f'));
            navigator.credentials.store(cred).catch(() => {});
          } catch (_) {}
        }
        const returnRoute = sessionStorage.getItem('fenix_return_route') || '#command';
        sessionStorage.removeItem('fenix_return_route');
        location.href = returnRoute === '#command' ? '/app#command' : '/app' + returnRoute;
      } catch (ex) { err.textContent = 'Erro de conexão'; }
    });

    document.getElementById('togglePw').addEventListener('click', function() {
      const pwInput = document.getElementById('pw');
      if (pwInput.type === 'password') {
        pwInput.type = 'text';
        this.textContent = '🙈';
      } else {
        pwInput.type = 'password';
        this.textContent = '👁️';
      }
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(loginPath, newContent, 'utf8');
console.log('Successfully updated grg/public/login.html');
