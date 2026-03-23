import { prisma } from '../../infra/database/prisma';
import { CreateCampaignDTO } from './campaign.dto';

export const campaignRepository = {
  create(data: CreateCampaignDTO) {
    return prisma.campaign.create({ data: { ...data, status: "draft" } });
  },

  list() {
    return prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { dispatches: true },
    });
  },

  findById(id: string) {
    return prisma.campaign.findUnique({ where: { id } });
  },

  updateStatus(id: string, status: string) {
    return prisma.campaign.update({
      where: { id },
      data: { status },
    });
  },

  async ensureSeedContacts() {
    const contacts = await prisma.contact.findMany({ take: 5 });
    if (contacts.length > 0) {
      return contacts;
    }

    await prisma.contact.createMany({
      data: [
        { name: "Lead One", phone: "+5511990000001", segment: "default" },
        { name: "Lead Two", phone: "+5511990000002", segment: "default" },
      ],
      skipDuplicates: true,
    });

    return prisma.contact.findMany({ take: 5 });
  },

  async createDispatches(campaignId: string) {
    const contacts = await campaignRepository.ensureSeedContacts();
    return prisma.messageDispatch.createMany({
      data: contacts.map((contact) => ({
        campaignId,
        contactId: contact.id,
        status: "queued",
      })),
      skipDuplicates: true,
    });
  },

  listDispatchByCampaign(campaignId: string) {
    return prisma.messageDispatch.findMany({
      where: { campaignId },
      orderBy: { id: "desc" },
    });
  },
};