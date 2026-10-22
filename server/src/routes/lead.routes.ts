import { Router } from 'express';
import { LeadController } from '../controllers/lead.controller';
import { LeadImportExportController, handleFileUpload } from '../controllers/lead-import-export.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', LeadController.list);

// Export Routes
router.get('/export/csv', requirePermission('LEADS', 'EXPORT'), LeadController.exportCsv);
router.post('/export', requirePermission('LEADS', 'EXPORT'), LeadImportExportController.exportLeads);

// Import Routes
router.get('/import/template', LeadImportExportController.downloadTemplate);
router.post('/import/upload', requirePermission('LEADS', 'CREATE'), handleFileUpload, LeadImportExportController.uploadFile);
router.post('/import/preview', requirePermission('LEADS', 'CREATE'), LeadImportExportController.preview);
router.post('/import/execute', requirePermission('LEADS', 'CREATE'), LeadImportExportController.executeImport);
router.get('/import/history', requirePermission('LEADS', 'VIEW'), LeadImportExportController.getHistory);
router.get('/import/jobs/:id', requirePermission('LEADS', 'VIEW'), LeadImportExportController.getJob);
router.get('/import/jobs/:id/error-report', requirePermission('LEADS', 'VIEW'), LeadImportExportController.downloadErrorReport);


router.post('/upload-image', LeadController.uploadImage);
router.get('/layout/config', LeadController.getLayoutConfig);
router.put('/layout/config', LeadController.updateLayoutConfig);
router.post('/', LeadController.create);
router.get('/:id', LeadController.getById);
router.patch('/:id', LeadController.update);
router.delete('/:id', LeadController.delete);
router.post('/:id/score', LeadController.rescore);
router.post('/:id/convert', LeadController.convert);

export default router;

