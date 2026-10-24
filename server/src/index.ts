import { createApp } from './app';
import { config, validateConfig } from './config';
import { prisma } from './utils/prisma';

const startServer = async () => {
  try {
    // Run production configuration security validation
    const validation = validateConfig();
    if (validation.warnings.length > 0) {
      validation.warnings.forEach((warn) => console.warn(`⚠️  ${warn}`));
    }
    if (!validation.valid) {
      console.error('❌ Server startup blocked by configuration validation errors:');
      validation.errors.forEach((err) => console.error(`   ${err}`));
      process.exit(1);
    }

    // Verify database connection
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database');

    const app = createApp();

    const server = app.listen(config.port, () => {
      console.log(`🚀 SwordNex AI CRM Server running on port ${config.port}`);
      console.log(`🔗 API Base: http://localhost:${config.port}${config.apiPrefix}`);
      console.log(`📡 Environment: ${config.nodeEnv}`);
    });

    const shutdown = async () => {
      try {
        server.close(async () => {
          await prisma.$disconnect().catch(() => {});
          process.exit(0);
        });
        setTimeout(() => process.exit(0), 1000).unref();
      } catch {
        process.exit(0);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('SIGUSR2', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
