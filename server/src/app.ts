import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { errorHandler } from './middleware/errorHandler.middleware';

// Route Handlers
import authRoutes from './routes/auth.routes';
import orgRoutes from './routes/organization.routes';
import leadRoutes from './routes/lead.routes';
import dealRoutes from './routes/deal.routes';
import contactRoutes from './routes/contact.routes';
import companyRoutes from './routes/company.routes';
import taskRoutes from './routes/task.routes';
import activityRoutes from './routes/activity.routes';
import commsRoutes from './routes/comms.routes';
import campaignRoutes from './routes/campaign.routes';
import aiRoutes from './routes/ai.routes';
import workflowRoutes from './routes/workflow.routes';
import reportRoutes from './routes/report.routes';
import integrationRoutes from './routes/integration.routes';
import billingRoutes from './routes/billing.routes';
import auditRoutes from './routes/audit.routes';
import superAdminRoutes from './routes/superAdmin.routes';
import roleRoutes from './routes/role.routes';
import subscriptionRoutes from './routes/subscription.routes';
import { requireActiveSubscription } from './middleware/subscription.middleware';
import { authenticate } from './middleware/auth.middleware';
import { resolveTenant } from './middleware/tenant.middleware';

export const createApp = (): Application => {
  const app = express();

  // Security Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173', '*'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id', 'x-razorpay-signature'],
    })
  );

  // Rate Limiter
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later.' },
  });
  app.use('/api', limiter);

  // Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request Logging
  if (config.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  // Health Checks
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      app: 'SwordNex AI CRM Server',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.get(`${config.apiPrefix}/health`, (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      app: 'SwordNex AI CRM REST API v1',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // SwordNex Super Admin Master Head Office Routes
  app.use('/api/swordnex-master', superAdminRoutes);
  app.use(`${config.apiPrefix}/swordnex-master`, superAdminRoutes);

  // Mount API v1 Routes
  const prefix = config.apiPrefix;
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/plans`, subscriptionRoutes);
  app.use(`${prefix}/subscriptions`, subscriptionRoutes);
  app.use(`${prefix}/payments`, subscriptionRoutes);
  app.use(`${prefix}/roles`, roleRoutes);

  // Tenant CRM Data Routes with Subscription Grace Period Enforcement
  app.use(`${prefix}/organizations`, orgRoutes);
  app.use(`${prefix}/leads`, authenticate, resolveTenant, requireActiveSubscription, leadRoutes);
  app.use(`${prefix}/deals`, authenticate, resolveTenant, requireActiveSubscription, dealRoutes);
  app.use(`${prefix}/contacts`, authenticate, resolveTenant, requireActiveSubscription, contactRoutes);
  app.use(`${prefix}/companies`, authenticate, resolveTenant, requireActiveSubscription, companyRoutes);
  app.use(`${prefix}/tasks`, authenticate, resolveTenant, requireActiveSubscription, taskRoutes);
  app.use(`${prefix}/activities`, authenticate, resolveTenant, requireActiveSubscription, activityRoutes);
  app.use(`${prefix}/comms`, authenticate, resolveTenant, requireActiveSubscription, commsRoutes);
  app.use(`${prefix}/campaigns`, authenticate, resolveTenant, requireActiveSubscription, campaignRoutes);
  app.use(`${prefix}/ai`, authenticate, resolveTenant, requireActiveSubscription, aiRoutes);
  app.use(`${prefix}/workflows`, authenticate, resolveTenant, requireActiveSubscription, workflowRoutes);
  app.use(`${prefix}/reports`, authenticate, resolveTenant, requireActiveSubscription, reportRoutes);
  app.use(`${prefix}/integrations`, authenticate, resolveTenant, requireActiveSubscription, integrationRoutes);
  app.use(`${prefix}/billing`, billingRoutes);
  app.use(`${prefix}/audit`, auditRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ success: false, error: `Endpoint not found: ${req.method} ${req.originalUrl}` });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp;
