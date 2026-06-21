import { loadConfig } from './config/environment';
import { createContainer } from './di/Container';
import { createApp } from './app';

/**
 * Server entry point.
 * Initializes the DI container, creates the Express app, and starts listening.
 * Handles graceful shutdown.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const container = createContainer(config);
  const app = createApp(container, config);

  const server = app.listen(config.port, () => {
    container.logger.info(`CarbonWise API server started`, {
      port: config.port,
      environment: config.nodeEnv,
      geminiEnabled: Boolean(config.geminiApiKey),
    });
  });

  // Graceful shutdown
  const shutdown = (signal: string): void => {
    container.logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      container.logger.info('Server closed');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      container.logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('unhandledRejection', (reason) => {
    container.logger.error('Unhandled rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });

  process.on('uncaughtException', (error) => {
    container.logger.error('Uncaught exception', {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
