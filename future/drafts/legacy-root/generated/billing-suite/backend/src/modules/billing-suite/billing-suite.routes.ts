import { Router } from 'express';
import { BillingSuiteController } from './billing-suite.controller';

const router = Router();

router.get('/billing-suite', BillingSuiteController.list);
router.post('/billing-suite', BillingSuiteController.create);

export { router as billing-suiteRouter };