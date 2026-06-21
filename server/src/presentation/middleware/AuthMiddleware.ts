import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppConfig } from '../../config/environment';
import { ILogger } from '../../domain/services/AuthService';

/**
 * Extended Express Request with authenticated user info.
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

/**
 * AuthMiddleware — verifies JWT tokens on protected routes.
 * Extracts userId from token and attaches to request.
 * Returns generic 401 on any auth failure (no information leakage).
 */
export function createAuthMiddleware(config: AppConfig, logger: ILogger) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
      req.user = { userId: decoded.userId };
      next();
    } catch (_error) {
      logger.debug('Auth token verification failed');
      res.status(401).json({ error: 'Authentication required' });
    }
  };
}

/**
 * Optional auth — attaches user if token present, continues regardless.
 */
export function createOptionalAuthMiddleware(config: AppConfig) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
        req.user = { userId: decoded.userId };
      } catch {
        // Token invalid — continue without user
      }
    }

    next();
  };
}
