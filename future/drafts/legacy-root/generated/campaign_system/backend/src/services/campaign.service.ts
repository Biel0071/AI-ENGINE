import { z } from 'zod';
import { campaignRepository } from '../repositories/campaign.repository';

const createCampaignSchema = z.object({
  name: z.string().min(3),
  message: z.string().min(1),
});

export const campaignService = {
  create(input: unknown) {
    const data = createCampaignSchema.parse(input);
    return campaignRepository.create(data);
  },

  list() {
    return campaignRepository.list();
  },

  async sendMessages(campaignId: string) {
    await campaignRepository.markSending(campaignId);
    await new Promise((resolve) => setTimeout(resolve, 350));
    return campaignRepository.markSent(campaignId);
  },

  trackStatus(campaignId: string) {
    return campaignRepository.getStatus(campaignId);
  },
};