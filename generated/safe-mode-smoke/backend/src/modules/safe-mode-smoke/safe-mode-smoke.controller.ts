import { Request, Response } from 'express';
import { SafeModeSmokeService } from './safe-mode-smoke.service';

export const SafeModeSmokeController = {
  async list(_req: Request, res: Response) {
    const data = await SafeModeSmokeService.list();
    return res.json(data);
  },

  async create(req: Request, res: Response) {
    const created = await SafeModeSmokeService.create(req.body);
    return res.status(201).json(created);
  },
};