class FenixHttpClient {
  constructor({ baseUrl = process.env.FENIX_URL || 'http://127.0.0.1:4400', token = process.env.FENIX_TOKEN || '', fetchImpl = globalThis.fetch } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); this.token = token; this.fetch = fetchImpl;
  }

  async request(path, { method = 'GET', body } = {}) {
    if (!this.token) throw new Error('FENIX_TOKEN is required');
    const response = await this.fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { authorization: `Bearer ${this.token}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let payload; try { payload = text ? JSON.parse(text) : {}; } catch { payload = { error: text }; }
    if (!response.ok) throw new Error(payload.message || payload.error?.message || payload.error || `FENIX HTTP ${response.status}`);
    return payload;
  }

  submit(input) { return this.request('/api/v2/jobs', { method: 'POST', body: input }); }
  get(jobId) { return this.request(`/api/v2/jobs/${encodeURIComponent(jobId)}`); }
  events(jobId) { return this.request(`/api/v2/jobs/${encodeURIComponent(jobId)}/events`); }
  cancel(jobId) { return this.request(`/api/v2/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST', body: {} }); }
  approve(jobId) { return this.request(`/api/v2/jobs/${encodeURIComponent(jobId)}/approve`, { method: 'POST', body: {} }); }
  reject(jobId, reason) { return this.request(`/api/v2/jobs/${encodeURIComponent(jobId)}/reject`, { method: 'POST', body: { reason } }); }
  rollback(jobId) { return this.request(`/api/v2/jobs/${encodeURIComponent(jobId)}/rollback`, { method: 'POST', body: {} }); }
  status() { return this.request('/api/v2/system/status'); }
}

module.exports = { FenixHttpClient };
