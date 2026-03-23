import { Router } from 'express';
import { campaignController } from './campaign.controller';
import { asyncHandler } from '../../shared/http/asyncHandler';

export const campaignRouter = Router();

campaignRouter.post("/campaigns", asyncHandler(campaignController.create));
campaignRouter.get("/campaigns", asyncHandler(campaignController.list));
campaignRouter.post("/campaigns/:id/send", asyncHandler(campaignController.send));
campaignRouter.get("/campaigns/:id/status", asyncHandler(campaignController.status));