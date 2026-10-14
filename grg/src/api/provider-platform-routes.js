'use strict';

const SESSION_TTL_MS = 11 * 60 * 60 * 1000;
const PROVIDER_NAMES = new Set([
  'openai', 'anthropic', 'xai', 'ollama', 'groq', 'gemini', 'openrouter',
  'huggingface', 'cloudflare', 'lmstudio', 'comfyui', 'forge', 'invokeai',
]);
const sessionsByApp = new WeakMap();

function sessionKey(identity) {
  return `${identity.tenantId}:${identity.actorId}`;
}

function platformOrigin(app) {
  const configured = app.providerPlatformBaseUrl
    || app.aiGateway?.providers?.aiplatform?.baseUrl
    || process.env.GRG_AIPLATFORM_URL
    || process.env.API_PLATFORM_URL
    || 'http://127.0.0.1:3001';
  const parsed = new URL(configured);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('invalid platform URL');
  }
  return parsed.origin;
}

function isSecureRequest(req) {
  if (req.socket?.encrypted) return true;
  const forwarded = String(req.headers?.['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  const origin = req.headers?.origin;
  if (forwarded && forwarded !== 'https') return false;
  if (origin) {
    try { return new URL(origin).protocol === 'https:' && (!forwarded || forwarded === 'https'); }
    catch { return false; }
  }
  return forwarded === 'https';
}

function safeErrorPayload(payload, status) {
  if (status === 401) return { ok: false, error: 'Credenciais administrativas inválidas', code: 'INVALID_CREDENTIALS' };
  if (status === 403) return { ok: false, error: 'A conta da API Platform precisa da função admin', code: 'ADMIN_REQUIRED' };
  if (status === 400) return { ok: false, error: 'A API Platform rejeitou os dados enviados', code: 'INVALID_REQUEST' };
  return { ok: false, error: 'A API Platform não concluiu a operação', code: 'PLATFORM_REQUEST_FAILED' };
}

function safeProvider(provider) {
  const health = provider?.health || {};
  return {
    name: String(provider?.name || '').slice(0, 80),
    capabilities: Array.isArray(provider?.capabilities)
      ? provider.capabilities.map((item) => String(item).slice(0, 40)).slice(0, 24)
      : [],
    health: {
      ok: health.ok === true,
      ...(Number.isFinite(Number(health.latencyMs)) ? { latencyMs: Number(health.latencyMs) } : {}),
      ...(typeof health.checkedAt === 'string' ? { checkedAt: health.checkedAt } : {}),
      ...(!health.ok && health.message ? { message: 'Provedor indisponível ou aguardando medição' } : {}),
      ...(!health.ok && health.error ? { error: 'Teste do provedor falhou' } : {}),
    },
    models: Array.isArray(provider?.models)
      ? provider.models.slice(0, 100).map((model) => ({
          id: String(model?.id || '').slice(0, 180),
          ...(model?.name ? { name: String(model.name).slice(0, 180) } : {}),
        })).filter((model) => model.id)
      : [],
  };
}

function safeConfig(config) {
  const settings = config?.settings && typeof config.settings === 'object' ? config.settings : {};
  let baseUrl;
  try {
    if (config?.baseUrl || settings.baseUrl) {
      const parsed = new URL(config.baseUrl || settings.baseUrl);
      if (['http:', 'https:'].includes(parsed.protocol)) baseUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/$/, '')}`;
    }
  } catch { /* invalid saved URL is hidden */ }
  return {
    name: String(config?.name || '').slice(0, 80),
    enabled: config?.enabled === true,
    hasApiKey: config?.hasApiKey === true || Boolean(settings.hasApiKey),
    defaultChat: settings.defaultChat === true,
    ...(baseUrl ? { baseUrl } : {}),
    ...(settings.accountId ? { accountId: String(settings.accountId).slice(0, 256) } : {}),
    ...(settings.defaultModel ? { defaultModel: String(settings.defaultModel).slice(0, 180) } : {}),
    ...(settings.embedModel ? { embedModel: String(settings.embedModel).slice(0, 180) } : {}),
  };
}

async function readUpstreamJson(response) {
  try { return await response.json(); }
  catch { return {}; }
}

async function handleProviderPlatformRoutes(req, res, url, sendJson, readJson, identity, app) {
  const pathname = url.pathname;
  if (!pathname.startsWith('/api/v2/provider-platform/')) return false;

  if (!identity?.tenantId || !identity?.actorId || !app?.controlPlane?.authorize) {
    return sendJson(res, 503, { ok: false, error: 'Serviço de autorização indisponível' });
  }
  try {
    await app.controlPlane.authorize(identity.tenantId, identity.actorId, 'runtime:admin');
  } catch {
    return sendJson(res, 403, { ok: false, error: 'Acesso administrativo do Fênix necessário' });
  }

  if (req.method === 'POST' && pathname === '/api/v2/provider-platform/session') {
    if (!isSecureRequest(req)) {
      return sendJson(res, 426, { ok: false, code: 'HTTPS_REQUIRED', error: 'Abra o Fênix pelo endereço HTTPS para conectar provedores' });
    }
    let credentials;
    try { credentials = await readJson(req); }
    catch { return sendJson(res, 400, { ok: false, error: 'Informe usuário e senha da API Platform' }); }
    const login = String(credentials?.login || credentials?.email || '').trim().slice(0, 254);
    const password = typeof credentials?.password === 'string' ? credentials.password : '';
    if (!login || !password || password.length > 1_024) {
      return sendJson(res, 400, { ok: false, error: 'Informe usuário e senha da API Platform' });
    }
    try {
      const fetchImpl = app.providerPlatformFetch || globalThis.fetch;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);
      let upstream;
      try {
        upstream = await fetchImpl(`${platformOrigin(app)}/admin/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ login, password }),
          signal: controller.signal,
        });
      } finally { clearTimeout(timer); }
      const payload = await readUpstreamJson(upstream);
      const token = payload.token || payload.data?.token;
      const role = payload.user?.role || payload.data?.user?.role;
      if (!upstream.ok || typeof token !== 'string' || !token || role !== 'admin') {
        return sendJson(res, upstream.status === 401 ? 401 : 403, safeErrorPayload(payload, upstream.status === 401 ? 401 : 403));
      }
      let sessions = sessionsByApp.get(app);
      if (!sessions) { sessions = new Map(); sessionsByApp.set(app, sessions); }
      const now = Date.now();
      for (const [key, session] of sessions) if (session.expiresAt <= now) sessions.delete(key);
      sessions.set(sessionKey(identity), {
        token,
        expiresAt: now + SESSION_TTL_MS,
        user: { id: String(payload.user?.id || payload.data?.user?.id || '').slice(0, 100), role: 'admin' },
      });
      return sendJson(res, 200, { ok: true, authenticated: true, expiresAt: new Date(now + SESSION_TTL_MS).toISOString() });
    } catch {
      return sendJson(res, 502, { ok: false, error: 'Não foi possível autenticar na API Platform', code: 'PLATFORM_UNAVAILABLE' });
    }
  }

  const sessions = sessionsByApp.get(app);
  const current = sessions?.get(sessionKey(identity));
  if (current && current.expiresAt <= Date.now()) sessions.delete(sessionKey(identity));
  const activeSession = current && current.expiresAt > Date.now() ? current : null;

  if (req.method === 'GET' && pathname === '/api/v2/provider-platform/session') {
    return sendJson(res, 200, {
      ok: true,
      authenticated: Boolean(activeSession),
      ...(activeSession ? { expiresAt: new Date(activeSession.expiresAt).toISOString(), user: activeSession.user } : {}),
    });
  }
  if (req.method === 'POST' && pathname === '/api/v2/provider-platform/session/logout') {
    sessions?.delete(sessionKey(identity));
    return sendJson(res, 200, { ok: true, authenticated: false });
  }
  if (!activeSession) return sendJson(res, 401, { ok: false, authenticated: false, error: 'Conecte a sessão administrativa da API Platform' });

  const routes = {
    'GET /api/v2/provider-platform/providers': { path: '/admin/providers', shape: (payload) => ({
      ok: true,
      defaults: payload.defaults && typeof payload.defaults === 'object' ? payload.defaults : {},
      providers: Array.isArray(payload.providers) ? payload.providers.map(safeProvider) : [],
    }) },
    'GET /api/v2/provider-platform/provider-configs': { path: '/admin/provider-configs', shape: (payload) => ({
      ok: true,
      configs: Array.isArray(payload.configs) ? payload.configs.map(safeConfig) : [],
    }) },
  };
  const key = `${req.method} ${pathname}`;
  let upstreamPath = routes[key]?.path;
  let shape = routes[key]?.shape;
  let body;
  let timeoutMs = 8_000;

  if (req.method === 'POST' && pathname === '/api/v2/provider-platform/provider-configs') {
    if (!isSecureRequest(req)) return sendJson(res, 426, { ok: false, code: 'HTTPS_REQUIRED', error: 'Abra o Fênix pelo endereço HTTPS para enviar chaves' });
    try { body = await readJson(req); } catch { return sendJson(res, 400, { ok: false, error: 'Configuração inválida' }); }
    const name = String(body?.name || '').trim().toLowerCase();
    if (!PROVIDER_NAMES.has(name) || typeof body?.enabled !== 'boolean'
      || (body.defaultChat != null && typeof body.defaultChat !== 'boolean')
      || (body.apiKey != null && (typeof body.apiKey !== 'string' || body.apiKey.length > 8_192))
      || (body.accountId != null && String(body.accountId).length > 256)
      || (body.defaultModel != null && String(body.defaultModel).length > 256)
      || (body.embedModel != null && String(body.embedModel).length > 256)) {
      return sendJson(res, 400, { ok: false, error: 'Campos ou provedor inválidos' });
    }
    let baseUrl = '';
    if (body.baseUrl) {
      try {
        const parsed = new URL(body.baseUrl);
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error();
        baseUrl = parsed.toString();
      } catch { return sendJson(res, 400, { ok: false, error: 'URL do provedor inválida' }); }
    }
    body = {
      name,
      enabled: body.enabled,
      defaultChat: body.defaultChat === true,
      ...(baseUrl ? { baseUrl } : {}),
      ...(body.apiKey ? { apiKey: body.apiKey } : {}),
      ...(body.accountId ? { accountId: String(body.accountId).trim() } : {}),
      ...(body.defaultModel ? { defaultModel: String(body.defaultModel).trim() } : {}),
      ...(body.embedModel ? { embedModel: String(body.embedModel).trim() } : {}),
    };
    upstreamPath = '/admin/provider-configs';
    shape = (payload) => ({ ok: payload.success === true, provider: name, registered: payload.registered === true });
  } else if (req.method === 'POST' && /^\/api\/v2\/provider-platform\/provider-configs\/[a-z0-9-]+\/test$/.test(pathname)) {
    if (!isSecureRequest(req)) return sendJson(res, 426, { ok: false, code: 'HTTPS_REQUIRED', error: 'Abra o Fênix pelo endereço HTTPS para testar provedores' });
    const name = pathname.split('/').at(-2);
    if (!PROVIDER_NAMES.has(name)) return sendJson(res, 404, { ok: false, error: 'Provedor desconhecido' });
    upstreamPath = `/admin/provider-configs/${encodeURIComponent(name)}/test`;
    shape = (payload) => ({
      ok: payload.success === true && payload.health?.ok === true,
      provider: name,
      health: {
        ok: payload.health?.ok === true,
        ...(Number.isFinite(Number(payload.health?.latencyMs)) ? { latencyMs: Number(payload.health.latencyMs) } : {}),
        ...(!payload.health?.ok ? { error: 'Teste de conexão falhou' } : {}),
      },
    });
  } else if (req.method === 'POST' && pathname === '/api/v2/provider-platform/test-text') {
    if (!isSecureRequest(req)) return sendJson(res, 426, { ok: false, code: 'HTTPS_REQUIRED', error: 'Abra o Fênix pelo endereço HTTPS para testar inferência' });
    try { body = await readJson(req); } catch { return sendJson(res, 400, { ok: false, error: 'Informe uma solicitação curta para o teste' }); }
    if (typeof body?.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 500
      || (body.provider && !PROVIDER_NAMES.has(String(body.provider)))
      || (body.model && String(body.model).length > 256)) {
      return sendJson(res, 400, { ok: false, error: 'Use um texto de até 500 caracteres e um provedor ou modelo válido' });
    }
    body = { prompt: body.prompt.trim(), maxTokens: 16, cache: false, strictQuality: false,
      ...(body.provider ? { provider: String(body.provider) } : {}),
      ...(body.model ? { model: String(body.model) } : {}) };
    upstreamPath = '/admin/test-text';
    timeoutMs = 30_000;
    shape = (payload) => {
      const result = payload.result || payload.data?.result || {};
      const text = typeof result === 'string' ? result : result.text || result.message?.content || payload.text || '';
      return {
        ok: payload.success !== false && Boolean(text),
        ...(payload.model || result.model ? { model: String(payload.model || result.model).slice(0, 180) } : {}),
        ...(text ? { text: String(text).slice(0, 4_000) } : {}),
      };
    };
  }

  if (!upstreamPath || !shape) return false;
  try {
    const fetchImpl = app.providerPlatformFetch || globalThis.fetch;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let upstream;
    try {
      upstream = await fetchImpl(`${platformOrigin(app)}${upstreamPath}`, {
        method: req.method,
        headers: { authorization: `Bearer ${activeSession.token}`, 'content-type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
    } finally { clearTimeout(timer); }
    const payload = await readUpstreamJson(upstream);
    if (!upstream.ok || payload.success === false) {
      return sendJson(res, upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502, safeErrorPayload(payload, upstream.status));
    }
    return sendJson(res, 200, shape(payload));
  } catch {
    return sendJson(res, 502, { ok: false, error: 'A API Platform não está acessível', code: 'PLATFORM_UNAVAILABLE' });
  }
}

module.exports = { handleProviderPlatformRoutes, isSecureRequest };
