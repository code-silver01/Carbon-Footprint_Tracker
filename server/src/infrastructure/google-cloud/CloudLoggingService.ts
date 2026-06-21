import winston from 'winston';
import { ILogger } from '../../domain/services/AuthService';

/**
 * CloudLoggingService — structured JSON logging compatible with Google Cloud Logging.
 *
 * Features:
 * - Structured JSON output (parsed by Cloud Logging)
 * - Correlation ID tracking
 * - Severity levels mapped to Cloud Logging levels
 * - Sensitive data filtering
 */
export class CloudLoggingService implements ILogger {
  private readonly winstonLogger: winston.Logger;

  constructor(serviceName: string, logLevel: string = 'info') {
    this.winstonLogger = winston.createLogger({
      level: logLevel,
      defaultMeta: {
        service: serviceName,
        version: process.env.npm_package_version ?? '1.0.0',
      },
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        this.isProduction()
          ? winston.format.json() // JSON for Cloud Logging in production
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length > 2
                  ? `\n  ${JSON.stringify(meta, null, 2)}`
                  : '';
                return `${String(timestamp)} [${level}] ${String(message)}${metaStr}`;
              }),
            ),
      ),
      transports: [new winston.transports.Console()],
    });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.info(message, this.sanitizeMeta(meta));
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.warn(message, this.sanitizeMeta(meta));
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.error(message, this.sanitizeMeta(meta));
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.debug(message, this.sanitizeMeta(meta));
  }

  /**
   * Creates a child logger with correlation ID for request tracking.
   */
  withCorrelationId(correlationId: string): ILogger {
    const childLogger = this.winstonLogger.child({ correlationId });
    return {
      info: (msg: string, meta?: Record<string, unknown>) =>
        childLogger.info(msg, this.sanitizeMeta(meta)),
      warn: (msg: string, meta?: Record<string, unknown>) =>
        childLogger.warn(msg, this.sanitizeMeta(meta)),
      error: (msg: string, meta?: Record<string, unknown>) =>
        childLogger.error(msg, this.sanitizeMeta(meta)),
      debug: (msg: string, meta?: Record<string, unknown>) =>
        childLogger.debug(msg, this.sanitizeMeta(meta)),
    };
  }

  /**
   * Strips sensitive fields from metadata before logging.
   */
  private sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!meta) return undefined;

    const sensitiveKeys = [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
      'authorization',
    ];

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(meta)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }
}
