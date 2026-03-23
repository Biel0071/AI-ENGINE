import { z } from 'zod';

export const createCampaignSchema = z.object({
  name: z.string().min(3),
  message: z.string().min(1),
});

export const sendCampaignSchema = z.object({
  campaignId: z.string().cuid(),
});

export type CreateCampaignDTO = z.infer<typeof createCampaignSchema>;