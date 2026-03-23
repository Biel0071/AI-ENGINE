import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { campaignRouter } from './modules/campaigns/campaign.routes';
import { errorHandler } from './shared/http/error-handler';
import { notFoundHandler } from './shared/http/not-found';

const generationPrompt = "Generate backend for feature: campaign_system\nModules: campaigns, contacts, messages\nEntities: Campaign(id, name, message, status, createdAt, updatedAt); Contact(id, name, phone, segment, createdAt); MessageDispatch(id, campaignId, contactId, status, sentAt)\nEndpoints/actions: POST /campaigns => create_campaign; GET /campaigns => list_campaigns; POST /campaigns/:id/send => send_messages; GET /campaigns/:id/status => track_status\nBusiness rules: [campaign_requires_message] A campaign cannot be created without a non-empty message body.; [campaign_name_min_length] Campaign name must have at least 3 characters.; [phone_must_be_e164] Contacts must use E.164 compatible phone format.; [send_only_draft_or_paused] Only campaigns in draft or paused status can be sent.\nUse clean architecture with modules, controllers, services, repositories, DTO validation and Prisma models.";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", generationPrompt });
  });

  app.use("/api", campaignRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}