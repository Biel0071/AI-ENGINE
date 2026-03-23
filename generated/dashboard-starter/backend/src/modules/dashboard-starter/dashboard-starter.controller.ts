import { Request, Response } from 'express';
import { DashboardStarterService } from './dashboard-starter.service';

export const DashboardStarterController = {
  async list(_req: Request, res: Response) {
    const data = await DashboardStarterService.list();
    return res.json(data);
  },

  async create(req: Request, res: Response) {
    const created = await DashboardStarterService.create(req.body);
    return res.status(201).json(created);
  },
};