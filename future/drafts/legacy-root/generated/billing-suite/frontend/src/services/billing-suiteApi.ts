import { request } from '../services/http/request';

export function listBillingSuite() {
  return request<Array<{ id: string; name: string }>>({ method: 'GET', url: '/billing-suite' });
}

export function createBillingSuite(payload: { name: string; description?: string }) {
  return request<{ id: string; name: string }>({ method: 'POST', url: '/billing-suite', data: payload });
}