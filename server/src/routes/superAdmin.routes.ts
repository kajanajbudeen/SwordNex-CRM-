import { Router } from 'express';
import { SuperAdminController } from '../controllers/superAdmin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireSuperAdmin } from '../middleware/superAdmin.middleware';

const router = Router();

// Public Master Auth Route
router.post('/auth/login', SuperAdminController.login);

// Protected Master Routes (Requires authenticated SUPER_ADMIN)
router.use(authenticate);
router.use(requireSuperAdmin);

// Analytics & Dashboard
router.get('/dashboard', SuperAdminController.getDashboard);
router.get('/subscriptions/analytics', SuperAdminController.getSubscriptionAnalytics);

// Organizations
router.get('/organizations', SuperAdminController.getOrganizations);
router.patch('/organizations/:id/status', SuperAdminController.updateOrganizationStatus);
router.post('/organizations/:id/extend-trial', SuperAdminController.extendTrial);

// Subscriptions & Operations
router.get('/subscriptions', SuperAdminController.getSubscriptions);
router.post('/subscriptions/:id/extend', SuperAdminController.extendSubscription);
router.patch('/subscriptions/:id/status', SuperAdminController.updateSubscriptionStatus);

// Plans & Entitlements
router.get('/plans', SuperAdminController.getPlans);
router.put('/plans/:slug', SuperAdminController.updatePlan);

// Ledger: Payments & Invoices
router.get('/payments', SuperAdminController.getPayments);
router.get('/invoices', SuperAdminController.getInvoices);

// Security & Audit
router.get('/audit-logs', SuperAdminController.getAuditLogs);

export default router;
