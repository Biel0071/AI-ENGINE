import axios from 'axios';

export interface ApiErrorPayload {
  message: string;
  statusCode: number;
  details?: unknown;
}

export class ApiError extends Error {
  constructor(public readonly payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
  }
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  config.headers.set("x-feature-name", "campaign_system");
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.message || error?.message || "Unexpected request error";
    const statusCode = Number(error?.response?.status || 500);
    const details = error?.response?.data?.details;
    return Promise.reject(new ApiError({ message, statusCode, details }));
  },
);

export { apiClient };