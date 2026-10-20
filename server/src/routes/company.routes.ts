import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', CompanyController.list);
router.post('/', CompanyController.create);
router.get('/:id', CompanyController.getById);
router.patch('/:id', CompanyController.update);
router.delete('/:id', CompanyController.delete);

export default router;
