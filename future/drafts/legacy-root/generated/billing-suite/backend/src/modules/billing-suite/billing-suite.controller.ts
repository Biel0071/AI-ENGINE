import { Request, Response } from 'express';
import { BillingSuiteService } from './billing-suite.service';

export const BillingSuiteController = {
  async list(_req: Request, res: Response) {
    const data = await BillingSuiteService.list();
    return res.json(data);
  },

  async create(req: Request, res: Response) {
    const created = await BillingSuiteService.create(req.body);
    return res.status(201).json(created);
  },
};