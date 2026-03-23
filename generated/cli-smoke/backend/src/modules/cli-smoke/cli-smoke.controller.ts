import { Request, Response } from 'express';
import { CliSmokeService } from './cli-smoke.service';

export const CliSmokeController = {
  async list(_req: Request, res: Response) {
    const data = await CliSmokeService.list();
    return res.json(data);
  },

  async create(req: Request, res: Response) {
    const created = await CliSmokeService.create(req.body);
    return res.status(201).json(created);
  },
};