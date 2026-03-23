import { Router } from 'express';
import { AiFallbackCheckController } from './ai-fallback-check.controller';

const router = Router();

router.get('/ai-fallback-check', AiFallbackCheckController.list);
router.post('/ai-fallback-check', AiFallbackCheckController.create);

export { router as ai-fallback-checkRouter };