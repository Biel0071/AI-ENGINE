import { prisma } from '../lib/prisma';

export interface CreateCampaignDTO {
  name: string;
  message: string;
}

export const campaignRepository = {
  create(data: CreateCampaignDTO) {
    return prisma.campaign.create({ data });
  },

  list() {
    return prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        dispatches: true,
      },
    });
  },

  async markSending(id: string) {
    return prisma.campaign.update({
      where: { id },
      data: { status: "sending" },
    });
  },

  async markSent(id: string) {
    return prisma.campaign.update({
      where: { id },
      data: { status: "sent" },
    });
  },

  getStatus(id: string) {
    return prisma.campaign.findUnique({
      where: { id },
      select: { id: true, name: true, status: true, updatedAt: true },
    });
  },
};