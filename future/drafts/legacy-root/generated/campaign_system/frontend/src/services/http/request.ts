import { AxiosRequestConfig } from 'axios';
import { apiClient } from './client';

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<T>(config);
  return response.data;
}