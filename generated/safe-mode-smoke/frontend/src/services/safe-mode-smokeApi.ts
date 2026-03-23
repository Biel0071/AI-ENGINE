import { request } from '../services/http/request';

export function listSafeModeSmoke() {
  return request<Array<{ id: string; name: string }>>({ method: 'GET', url: '/safe-mode-smoke' });
}

export function createSafeModeSmoke(payload: { name: string; description?: string }) {
  return request<{ id: string; name: string }>({ method: 'POST', url: '/safe-mode-smoke', data: payload });
}