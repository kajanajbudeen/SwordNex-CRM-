import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import { webhookLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Public / Unauthenticated webhook endpoint (Razorpay / Cashfree)
router.post('/webhook', webhookLimiter, SubscriptionController.handleWebhook);

// Public / Tenant plan listing (available at /api/v1/plans and /api/v1/subscriptions/plans)
router.get('/', SubscriptionController.getPlans);
router.get('/plans', SubscriptionController.getPlans);

// Authenticated tenant routes
router.use(authenticate);
router.use(resolveTenant);

router.get('/current', SubscriptionController.getCurrentSubscription);
router.get('/usage', SubscriptionController.getUsage);
router.get('/invoices', SubscriptionController.getInvoices);
router.get('/invoices/:id/download', SubscriptionController.getInvoicePdf);
router.get('/payments', SubscriptionController.getPayments);

// Admin-only billing actions
router.post('/checkout', requireRoles(['ADMIN', 'SUPER_ADMIN']), SubscriptionController.checkout);
router.post('/verify', requireRoles(['ADMIN', 'SUPER_ADMIN']), SubscriptionController.verifyPayment);
router.post('/upgrade', requireRoles(['ADMIN', 'SUPER_ADMIN']), SubscriptionController.upgradeSubscription);
router.post('/downgrade', requireRoles(['ADMIN', 'SUPER_ADMIN']), SubscriptionController.downgradeSubscription);
router.post('/cancel', requireRoles(['ADMIN', 'SUPER_ADMIN']), SubscriptionController.cancelSubscription);

export default router;
