import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ILogger } from '../../domain/services/AuthService';


/**
 * Request logging middleware.
 * Adds correlation ID, logs request/response timing.
 */
export function createRequestLogger(logger: ILogger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req.headers['x-correlation-id'] as string) ?? uuidv4();
    const startTime = Date.now();

    // Attach correlation ID to response headers
    res.setHeader('x-correlation-id', correlationId);

    // Log on response finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logData: Record<string, unknown> = {
        correlationId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.headers['user-agent'],
        userId: (req as { user?: { userId: string } }).user?.userId,
      };

      if (res.statusCode >= 400) {
        logger.warn('Request completed with error', logData);
      } else {
        logger.info('Request completed', logData);
      }
    });

    next();
  };
}
