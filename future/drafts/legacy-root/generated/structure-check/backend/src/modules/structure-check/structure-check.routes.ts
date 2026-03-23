import { Router } from 'express';
import { StructureCheckController } from './structure-check.controller';

const router = Router();

router.get('/structure-check', StructureCheckController.list);
router.post('/structure-check', StructureCheckController.create);

export { router as structure-checkRouter };