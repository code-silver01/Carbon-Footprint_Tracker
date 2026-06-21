import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../domain/errors';
import { ILogger } from '../../domain/services/AuthService';

/**
 * Global error handling middleware.
 * - Maps domain errors to HTTP responses
 * - Never exposes internal error details
 * - Logs full error info server-side
 */
export function createErrorHandler(logger: ILogger) {
  return (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    // Log full error details (server-side only)
    logger.error('Request error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      userId: (req as { user?: { userId: string } }).user?.userId,
    });

    // Handle known application errors
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: err.message,
      });
      return;
    }

    // Handle JSON parse errors
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({
        error: 'Invalid request body',
      });
      return;
    }

    // Generic 500 — never expose internals
    res.status(500).json({
      error: 'An unexpected error occurred',
    });
  };
}

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
  });
}
