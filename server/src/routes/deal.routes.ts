import { Router } from 'express';
import { DealController } from '../controllers/deal.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/pipelines', DealController.listPipelines);
router.get('/export/csv', requirePermission('DEALS', 'EXPORT'), DealController.exportCsv);
router.get('/', DealController.listDeals);
router.post('/', DealController.create);
router.get('/:id', DealController.getById);
router.patch('/:id', DealController.update);
router.delete('/:id', DealController.delete);
router.post('/:id/analyze-health', DealController.analyzeHealth);

export default router;
