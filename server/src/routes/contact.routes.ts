import { Router } from 'express';
import { ContactController } from '../controllers/contact.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', ContactController.list);
router.get('/export/csv', requirePermission('CONTACTS', 'EXPORT'), ContactController.exportCsv);
router.post('/', ContactController.create);
router.get('/:id', ContactController.getById);
router.patch('/:id', ContactController.update);
router.delete('/:id', ContactController.delete);

export default router;
