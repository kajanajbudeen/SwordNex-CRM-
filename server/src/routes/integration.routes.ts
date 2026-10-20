import { Router } from 'express';
import { IntegrationController } from '../controllers/integration.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';
import { requireRoles } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', IntegrationController.list);
router.post('/', requireRoles(['ADMIN']), IntegrationController.update);

export default router;
