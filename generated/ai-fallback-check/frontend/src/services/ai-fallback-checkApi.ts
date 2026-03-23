import { request } from '../services/http/request';

export function listAiFallbackCheck() {
  return request<Array<{ id: string; name: string }>>({ method: 'GET', url: '/ai-fallback-check' });
}

export function createAiFallbackCheck(payload: { name: string; description?: string }) {
  return request<{ id: string; name: string }>({ method: 'POST', url: '/ai-fallback-check', data: payload });
}