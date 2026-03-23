import { Request, Response } from 'express';
import { StructureCheckService } from './structure-check.service';

export const StructureCheckController = {
  async list(_req: Request, res: Response) {
    const data = await StructureCheckService.list();
    return res.json(data);
  },

  async create(req: Request, res: Response) {
    const created = await StructureCheckService.create(req.body);
    return res.status(201).json(created);
  },
};