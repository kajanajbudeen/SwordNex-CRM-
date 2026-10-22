import { Router } from 'express';
import { CustomerInvoiceController } from '../controllers/customer-invoice.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/aging-summary', CustomerInvoiceController.getAgingSummary);
router.get('/', CustomerInvoiceController.list);
router.post('/', CustomerInvoiceController.create);
router.get('/:id', CustomerInvoiceController.getById);
router.post('/:id/payments', CustomerInvoiceController.recordPayment);

export default router;
