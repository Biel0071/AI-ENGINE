import { Router } from 'express';
import { SafeModeSmokeController } from './safe-mode-smoke.controller';

const router = Router();

router.get('/safe-mode-smoke', SafeModeSmokeController.list);
router.post('/safe-mode-smoke', SafeModeSmokeController.create);

export { router as safe-mode-smokeRouter };