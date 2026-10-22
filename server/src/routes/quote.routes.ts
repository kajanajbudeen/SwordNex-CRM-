import { Router } from 'express';
import { QuoteController } from '../controllers/quote.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', QuoteController.list);
router.post('/', QuoteController.create);
router.get('/:id', QuoteController.getById);
router.patch('/:id', QuoteController.update);
router.post('/:id/convert-to-order', QuoteController.convertToOrder);
router.post('/:id/convert-to-invoice', QuoteController.convertToInvoice);

export default router;
