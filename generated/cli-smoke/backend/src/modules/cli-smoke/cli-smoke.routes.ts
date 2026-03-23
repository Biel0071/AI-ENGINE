import { Router } from 'express';
import { CliSmokeController } from './cli-smoke.controller';

const router = Router();

router.get('/cli-smoke', CliSmokeController.list);
router.post('/cli-smoke', CliSmokeController.create);

export { router as cli-smokeRouter };