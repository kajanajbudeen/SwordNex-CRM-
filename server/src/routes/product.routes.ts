import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', ProductController.list);
router.post('/', ProductController.create);
router.get('/:id', ProductController.getById);
router.patch('/:id', ProductController.update);
router.delete('/:id', ProductController.delete);

export default router;
