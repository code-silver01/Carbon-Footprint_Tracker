import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { AppConfig } from './config/environment';
import { AppContainer } from './di/Container';
import { createGlobalRateLimiter } from './presentation/middleware/RateLimitMiddleware';
import { createErrorHandler, notFoundHandler } from './presentation/middleware/ErrorHandlingMiddleware';
import { createRequestLogger } from './presentation/middleware/RequestLoggingMiddleware';

// Routes
import { createAuthRoutes } from './presentation/routes/auth.routes';
import { createFootprintRoutes } from './presentation/routes/footprint.routes';
import { createAdviceRoutes } from './presentation/routes/advice.routes';
import { createRoadmapRoutes } from './presentation/routes/roadmap.routes';
import { createProgressRoutes } from './presentation/routes/progress.routes';

/**
 * Creates and configures the Express application.
 * Separating app creation from server start enables testing with supertest.
 */
export function createApp(container: AppContainer, config: AppConfig): Express {
  const app = express();

  // --- Security Middleware ---
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'", 'https:'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
      reportOnly: false,
    },
    crossOriginEmbedderPolicy: false,
    // Strict Transport Security: force HTTPS for 1 year
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    // Prevent MIME-type sniffing
    noSniff: true,
    // Prevent clickjacking
    frameguard: { action: 'deny' },
    // Strict referrer policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  app.use(cors({
    origin: config.frontendUrl.includes(',') ? config.frontendUrl.split(',') : config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    maxAge: 86400,
  }));

  // --- Parsing ---
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: false }));

  // --- Request Logging ---
  app.use(createRequestLogger(container.logger));

  // --- Global Rate Limiting ---
  app.use(createGlobalRateLimiter(config));

  // --- Health Check Endpoints ---
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'carbonwise-api',
    });
  });

  app.get('/ready', (_req, res) => {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  });

  // --- API Routes ---
  app.use('/api/auth', createAuthRoutes(container.authController, config, container.logger));
  app.use('/api/footprints', createFootprintRoutes(container.footprintController, config, container.logger));
  app.use('/api/advice', createAdviceRoutes(container.advisorController, config, container.logger));
  app.use('/api/roadmaps', createRoadmapRoutes(container.roadmapController, config, container.logger));
  app.use('/api/progress', createProgressRoutes(container.progressController, config, container.logger));

  // --- Error Handling ---
  app.use(notFoundHandler);
  app.use(createErrorHandler(container.logger));

  return app;
}
