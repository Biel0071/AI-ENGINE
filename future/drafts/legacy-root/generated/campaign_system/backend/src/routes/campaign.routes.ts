import { Router } from 'express';
import { campaignController } from '../controllers/campaign.controller';

export const campaignRouter = Router();

campaignRouter.post("/campaigns", campaignController.create);
campaignRouter.get("/campaigns", campaignController.list);
campaignRouter.post("/campaigns/:id/send", campaignController.send);
campaignRouter.get("/campaigns/:id/status", campaignController.status);