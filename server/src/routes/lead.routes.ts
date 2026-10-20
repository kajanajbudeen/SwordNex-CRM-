import { Router } from 'express';
import { LeadController } from '../controllers/lead.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', LeadController.list);
router.get('/export/csv', requirePermission('LEADS', 'EXPORT'), LeadController.exportCsv);
router.post('/', LeadController.create);
router.get('/:id', LeadController.getById);
router.patch('/:id', LeadController.update);
router.delete('/:id', LeadController.delete);
router.post('/:id/score', LeadController.rescore);
router.post('/:id/convert', LeadController.convert);

export default router;
