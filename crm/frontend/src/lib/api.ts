import axios, { AxiosRequestConfig } from 'axios';
import { ApiEnvelope } from '../types';

const http = axios.create({
  baseURL: '/',
  timeout: 15000,
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Request failed';
    return Promise.reject(new Error(message));
  },
);

function unwrap<T>(payload: ApiEnvelope<T> | T): T {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (!envelope.success) {
      throw new Error(envelope.error || 'Request failed');
    }
    return envelope.data;
  }
  return payload as T;
}

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await http.request<ApiEnvelope<T> | T>(config);
  return unwrap(response.data);
}

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => apiRequest<T>({ method: 'GET', url, ...config }),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => apiRequest<T>({ method: 'POST', url, data, ...config }),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => apiRequest<T>({ method: 'PUT', url, data, ...config }),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => apiRequest<T>({ method: 'PATCH', url, data, ...config }),
  delete: <T>(url: string, config?: AxiosRequestConfig) => apiRequest<T>({ method: 'DELETE', url, ...config }),
};
