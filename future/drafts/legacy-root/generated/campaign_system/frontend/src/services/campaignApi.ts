import { request } from './http/request';

export interface Campaign {
  id: string;
  name: string;
  message: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CampaignStatus {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  dispatches: Array<{
    id: string;
    status: string;
    sentAt?: string | null;
  }>;
}

export function listCampaigns() {
  return request<Campaign[]>({ method: "GET", url: "/campaigns" });
}

export function createCampaign(payload: { name: string; message: string }) {
  return request<Campaign>({ method: "POST", url: "/campaigns", data: payload });
}

export function sendCampaign(campaignId: string) {
  return request<Campaign>({ method: "POST", url: `/campaigns/${campaignId}/send` });
}

export function trackCampaignStatus(campaignId: string) {
  return request<CampaignStatus>({ method: "GET", url: `/campaigns/${campaignId}/status` });
}