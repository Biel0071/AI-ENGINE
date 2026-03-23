import { request } from '../services/http/request';

export function listCliSmoke() {
  return request<Array<{ id: string; name: string }>>({ method: 'GET', url: '/cli-smoke' });
}

export function createCliSmoke(payload: { name: string; description?: string }) {
  return request<{ id: string; name: string }>({ method: 'POST', url: '/cli-smoke', data: payload });
}