import { Request, Response } from 'express';
import { campaignService } from './campaign.service';

export const campaignController = {
  async create(req: Request, res: Response) {
    const result = await campaignService.create(req.body);
    return res.status(201).json(result);
  },

  async list(_req: Request, res: Response) {
    const result = await campaignService.list();
    return res.json(result);
  },

  async send(req: Request, res: Response) {
    const result = await campaignService.send(req.params.id);
    return res.json(result);
  },

  async status(req: Request, res: Response) {
    const result = await campaignService.status(req.params.id);
    return res.json(result);
  },
};