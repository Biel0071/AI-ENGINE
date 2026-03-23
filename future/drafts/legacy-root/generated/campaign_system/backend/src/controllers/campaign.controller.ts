import { Request, Response } from 'express';
import { campaignService } from '../services/campaign.service';

export const campaignController = {
  async create(req: Request, res: Response) {
    const campaign = await campaignService.create(req.body);
    return res.status(201).json(campaign);
  },

  async list(_req: Request, res: Response) {
    const campaigns = await campaignService.list();
    return res.json(campaigns);
  },

  async send(req: Request, res: Response) {
    const campaign = await campaignService.sendMessages(req.params.id);
    return res.json(campaign);
  },

  async status(req: Request, res: Response) {
    const campaignStatus = await campaignService.trackStatus(req.params.id);
    if (!campaignStatus) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    return res.json(campaignStatus);
  },
};