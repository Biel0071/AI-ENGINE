import { request } from '../services/http/request';

export function listDashboardStarter() {
  return request<Array<{ id: string; name: string }>>({ method: 'GET', url: '/dashboard-starter' });
}

export function createDashboardStarter(payload: { name: string; description?: string }) {
  return request<{ id: string; name: string }>({ method: 'POST', url: '/dashboard-starter', data: payload });
}