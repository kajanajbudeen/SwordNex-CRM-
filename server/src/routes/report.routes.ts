import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/dashboard-summary', ReportController.getDashboardSummary);
router.get('/sales-velocity', ReportController.getSalesVelocity);
router.get('/lead-sources', ReportController.getLeadSources);
router.get('/usage-metrics', ReportController.getUsageAndAiMetrics);

export default router;
