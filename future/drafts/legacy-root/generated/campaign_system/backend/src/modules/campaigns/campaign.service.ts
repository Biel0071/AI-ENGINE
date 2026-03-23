import { AppError } from '../../shared/errors/AppError';
import { campaignRepository } from './campaign.repository';
import { createCampaignSchema, sendCampaignSchema } from './campaign.dto';

const sendableStatuses = new Set(["draft", "paused"]);

export const campaignService = {
  async create(input: unknown) {
    const data = createCampaignSchema.parse(input);
    return campaignRepository.create(data);
  },

  list() {
    return campaignRepository.list();
  },

  async send(campaignId: string) {
    sendCampaignSchema.parse({ campaignId });
    const campaign = await campaignRepository.findById(campaignId);

    if (!campaign) {
      throw new AppError(404, "Campaign not found");
    }

    if (!sendableStatuses.has(campaign.status)) {
      throw new AppError(409, "Campaign is not in a sendable status", {
        campaignId,
        status: campaign.status,
      });
    }

    await campaignRepository.updateStatus(campaignId, "sending");
    await campaignRepository.createDispatches(campaignId);
    return campaignRepository.updateStatus(campaignId, "sent");
  },

  async status(campaignId: string) {
    const campaign = await campaignRepository.findById(campaignId);
    if (!campaign) {
      throw new AppError(404, "Campaign not found");
    }

    const dispatches = await campaignRepository.listDispatchByCampaign(campaignId);
    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      dispatches,
      updatedAt: campaign.updatedAt,
    };
  },
};