import { Router } from 'express';
import { DashboardStarterController } from './dashboard-starter.controller';

const router = Router();

router.get('/dashboard-starter', DashboardStarterController.list);
router.post('/dashboard-starter', DashboardStarterController.create);

export { router as dashboard-starterRouter };