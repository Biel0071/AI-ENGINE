'use strict';

class BaiAdapter {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl ?? process.env.FENIX_BAI_URL ?? '';
    this.token = options.token ?? process.env.FENIX_BAI_TOKEN ?? '';
    this.fetch = options.fetch || globalThis.fetch;
    this.timeoutMs = Number(options.timeoutMs) || 5000;
  }

  async getStatus() {
    if (!this.baseUrl || !this.token) {
      return { ok: true, status: 'UNCONFIGURED', source: 'BAI_API', message: 'Configure FENIX_BAI_URL e FENIX_BAI_TOKEN no backend para consultar o BAI.' };
    }
    if (!/^[A-Za-z0-9_-]{43}$/.test(this.token)) return { ok: false, status: 'INVALID_CREDENTIALS', source: 'BAI_API' };
    let base;
    try {
      base = new URL(this.baseUrl);
      const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
      if (!['http:', 'https:'].includes(base.protocol) || (base.protocol !== 'https:' && !loopback) || base.username || base.password || base.search || base.hash) {
        return { ok: false, status: 'INVALID_CONFIGURATION', source: 'BAI_API', message: 'A URL do BAI precisa usar HTTPS; HTTP só é aceito em loopback.' };
      }
    } catch {
      return { ok: false, status: 'INVALID_CONFIGURATION', source: 'BAI_API', message: 'URL do BAI inválida.' };
    }
    if (typeof this.fetch !== 'function') return { ok: false, status: 'UNAVAILABLE', source: 'BAI_API', message: 'Fetch não está disponível neste runtime.' };

    try {
      const [identityResult, profilesResult, hostsResult] = await Promise.allSettled([
        this._get(base, '/v1/me'), this._get(base, '/v1/profiles'), this._get(base, '/v1/hosts')
      ]);
      if (identityResult.status === 'rejected' || profilesResult.status === 'rejected') throw (identityResult.reason || profilesResult.reason);
      const identityResponse = identityResult.value;
      const profilesResponse = profilesResult.value;
      const hostsResponse = hostsResult.status === 'fulfilled' ? hostsResult.value : null;
      if (!identityResponse.ok || !profilesResponse.ok) {
        const statusCode = !identityResponse.ok ? identityResponse.status : profilesResponse.status;
        return { ok: false, status: statusCode === 401 ? 'AUTHENTICATION_FAILED' : 'UNAVAILABLE', source: 'BAI_API', statusCode };
      }
      const identity = await identityResponse.json();
      const profiles = await profilesResponse.json();
      if (!Array.isArray(profiles)) return { ok: false, status: 'INVALID_RESPONSE', source: 'BAI_API' };
      const hosts = hostsResponse?.ok ? await hostsResponse.json() : null;
      const kindCounts = {};
      for (const profile of profiles) {
        if (profile && typeof profile.kind === 'string') kindCounts[profile.kind] = (kindCounts[profile.kind] || 0) + 1;
      }
      return {
        ok: true,
        status: 'CONNECTED',
        source: 'BAI_API',
        identity: { id: typeof identity?.id === 'string' ? identity.id : null, role: typeof identity?.role === 'string' ? identity.role : null },
        profiles: { count: profiles.length, kinds: kindCounts },
        hosts: Array.isArray(hosts) ? { count: hosts.length, active: hosts.filter((host) => host?.active === true).length } : { status: hostsResponse?.status === 403 ? 'PERMISSION_DENIED' : 'NOT_AVAILABLE' },
        capabilities: {
          profileMetadata: 'AVAILABLE',
          hosts: Array.isArray(hosts) ? 'AVAILABLE' : 'NOT_AVAILABLE',
          runningInstances: 'NOT_EXPOSED_BY_BAI_API',
          automationCatalog: 'NOT_EXPOSED_BY_BAI_API',
          executorHeartbeat: 'NOT_EXPOSED_BY_BAI_API',
          jobListing: 'NOT_EXPOSED_BY_BAI_API'
        }
      };
    } catch (error) {
      return { ok: false, status: error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'TIMEOUT' : 'UNAVAILABLE', source: 'BAI_API' };
    }
  }

  _get(base, route) {
    const endpoint = new URL(route, base.href.endsWith('/') ? base : `${base.href}/`);
    return this.fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${this.token}` },
      redirect: 'error',
      signal: AbortSignal.timeout(this.timeoutMs)
    });
  }
}

const globalBaiAdapter = new BaiAdapter();
module.exports = { BaiAdapter, globalBaiAdapter };
