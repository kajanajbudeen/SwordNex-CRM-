import { createApp } from './app';
import { config } from './config';
import { prisma } from './utils/prisma';

const startServer = async () => {
  try {
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
