import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { LeadImportExportService } from '../services/lead-import-export.service';
import { sendSuccess, sendError } from '../utils/response';

// Multer in-memory storage configuration with size limit
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel (.xlsx) files are supported.'));
    }
  },
});

export const handleFileUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadMiddleware.single('file')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
};

export class LeadImportExportController {
  /**
   * Upload and initial spreadsheet inspection
   */
  static async uploadFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return sendError(res, 'No file uploaded. Please select a CSV or Excel file.', 400);
      }

      const result = LeadImportExportService.parseUploadedBuffer(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      return sendSuccess(res, result, 'File uploaded and parsed successfully');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to parse uploaded file', 400);
    }
  }

  /**
   * Preview mapping, validation rules, and duplicate detection
   */
  static async preview(req: Request, res: Response) {
    try {
      const { fileToken, mapping, options } = req.body;

      if (!fileToken) {
        return sendError(res, 'File token is required', 400);
      }

      if (!mapping || typeof mapping !== 'object') {
        return sendError(res, 'Column mapping is required', 400);
      }

      const previewResult = await LeadImportExportService.previewAndValidate(
        req.organizationId!,
        fileToken,
        mapping,
        {
          defaultOwnerId: options?.defaultOwnerId,
          defaultSource: options?.defaultSource || 'WEBSITE',
          defaultStatus: options?.defaultStatus || 'NEW',
          duplicateStrategy: options?.duplicateStrategy || 'SKIP',
          duplicateCriteria: options?.duplicateCriteria || ['email', 'phone'],
        }
      );

      return sendSuccess(res, previewResult, 'Import preview generated successfully');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to preview import', 400);
    }
  }

  /**
   * Final confirmation & execution of lead import
   */
  static async executeImport(req: Request, res: Response) {
    try {
      const { fileToken, mapping, options } = req.body;

      if (!fileToken) {
        return sendError(res, 'File token is required', 400);
      }

      if (!mapping || !mapping.firstName || !mapping.lastName) {
        return sendError(res, 'Valid column mapping for First Name and Last Name is required', 400);
      }

      const result = await LeadImportExportService.executeImport({
        organizationId: req.organizationId!,
        userId: req.user!.id,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        fileToken,
        mapping,
        options: {
          defaultOwnerId: options?.defaultOwnerId,
          defaultSource: options?.defaultSource || 'WEBSITE',
          defaultStatus: options?.defaultStatus || 'NEW',
          duplicateStrategy: options?.duplicateStrategy || 'SKIP',
          duplicateCriteria: options?.duplicateCriteria || ['email', 'phone'],
        },
      });

      return sendSuccess(res, result, 'Leads import completed successfully', undefined, 201);
    } catch (err: any) {
      return sendError(res, err.message || 'Import execution failed', 400);
    }
  }

  /**
   * Get tenant import history
   */
  static async getHistory(req: Request, res: Response) {
    try {
      const history = await LeadImportExportService.getImportHistory(req.organizationId!);
      return sendSuccess(res, history, 'Import history retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch import history', 500);
    }
  }

  /**
   * Get single import job details
   */
  static async getJob(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const job = await LeadImportExportService.getImportJob(req.organizationId!, id);
      return sendSuccess(res, job, 'Import job retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message || 'Import job not found', 404);
    }
  }

  /**
   * Download error report for an import job
   */
  static async downloadErrorReport(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const format = (req.query.format as string) === 'xlsx' ? 'xlsx' : 'csv';

      const buffer = await LeadImportExportService.generateErrorReport(req.organizationId!, id, format);

      if (format === 'xlsx') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="import-errors-${id}.xlsx"`);
      } else {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="import-errors-${id}.csv"`);
      }

      return res.status(200).send(buffer);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to download error report', 400);
    }
  }

  /**
   * Download sample import template
   */
  static async downloadTemplate(req: Request, res: Response) {
    try {
      const format = (req.query.format as string) === 'xlsx' ? 'xlsx' : 'csv';
      const buffer = LeadImportExportService.generateSampleTemplate(format);

      if (format === 'xlsx') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="swordnex-leads-import-template.xlsx"');
      } else {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="swordnex-leads-import-template.csv"');
      }

      return res.status(200).send(buffer);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to generate template', 500);
    }
  }

  /**
   * Advanced lead export with scope, field selection, and format selection
   */
  static async exportLeads(req: Request, res: Response) {
    try {
      const {
        scope = 'FILTERED',
        selectedIds,
        filters,
        dateRange,
        fields,
        format = 'csv',
      } = req.body;

      const exportResult = await LeadImportExportService.exportLeads({
        organizationId: req.organizationId!,
        userId: req.user!.id,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        scope,
        selectedIds,
        filters,
        dateRange,
        fields,
        format: format === 'xlsx' ? 'xlsx' : 'csv',
      });

      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      return res.status(200).send(exportResult.buffer);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to export leads', 400);
    }
  }
}
