import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';
import { requireRoles } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate, resolveTenant, requireRoles(['ADMIN']));

router.get('/logs', AuditController.list);

export default router;
