import { Request, Response } from 'express';
import { AiFallbackCheckService } from './ai-fallback-check.service';

export const AiFallbackCheckController = {
  async list(_req: Request, res: Response) {
    const data = await AiFallbackCheckService.list();
    return res.json(data);
  },

  async create(req: Request, res: Response) {
    const created = await AiFallbackCheckService.create(req.body);
    return res.status(201).json(created);
  },
};