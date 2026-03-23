import { request } from '../services/http/request';

export function listStructureCheck() {
  return request<Array<{ id: string; name: string }>>({ method: 'GET', url: '/structure-check' });
}

export function createStructureCheck(payload: { name: string; description?: string }) {
  return request<{ id: string; name: string }>({ method: 'POST', url: '/structure-check', data: payload });
}