import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Extend Express Request to include logging context
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * Middleware to add request correlation ID and logging context
 * This should be one of the first middlewares in the chain
 */
export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate or use existing request ID
  const requestId = (req.headers['x-request-id'] as string) || uuidv4().substring(0, 8);
  req.requestId = requestId;
  req.startTime = Date.now();

  // Add request ID to response headers for tracing
  res.setHeader('X-Request-ID', requestId);

  // Extract user info if available (will be set by auth middleware later)
  const userId = (req as any).user?.id;

  // Create logging context
  const context = {
    requestId,
    userId,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    method: req.method,
    path: req.originalUrl || req.path
  };

  next();
};

/**
 * Middleware to log HTTP requests and responses
 */
export const httpLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = req.startTime || Date.now();
  const requestId = req.requestId || 'unknown';

  // Log incoming request
  logger.http(`→ ${req.method} ${req.originalUrl}`, {
    category: 'api',
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length']
  });

  // Capture response
  const originalSend = res.send;
  let responseBody: any;

  res.send = function (body: any): Response {
    responseBody = body;
    return originalSend.call(this, body);
  };

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const statusCategory = Math.floor(statusCode / 100);

    // Determine log level based on status code
    const logData = {
      category: 'api',
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode,
      duration,
      durationFormatted: duration > 1000 ? `${(duration / 1000).toFixed(2)}s` : `${duration}ms`,
      contentLength: res.get('content-length')
    };

    if (statusCategory === 5) {
      // Server errors
      logger.error(`← ${req.method} ${req.originalUrl} ${statusCode} (${duration}ms)`, undefined, logData);
    } else if (statusCategory === 4) {
      // Client errors
      logger.warn(`← ${req.method} ${req.originalUrl} ${statusCode} (${duration}ms)`, logData);
    } else {
      // Success
      logger.http(`← ${req.method} ${req.originalUrl} ${statusCode} (${duration}ms)`, logData);
    }

    // Log slow requests (threshold configurable via env, default 5s)
    const slowThreshold = parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '5000', 10);
    if (duration > slowThreshold) {
      logger.warn(`Slow request: ${req.method} ${req.originalUrl} took ${duration}ms (threshold: ${slowThreshold}ms)`, {
        category: 'performance', requestId, statusCode, userId: (req as any).user?.id, ip: req.ip, duration
      });
    }
  });

  next();
};

/**
 * Middleware to update logging context with authenticated user
 */
export const userContextMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const user = (req as any).user;
  if (user?.id) {
    logger.debug(`User context set: userId=${user.id}`);
  }
  next();
};

/**
 * Middleware to log request body (for debugging, use sparingly)
 * Only logs in development mode and excludes sensitive fields
 */
export const requestBodyLoggingMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV !== 'production' && req.body && Object.keys(req.body).length > 0) {
    // Exclude sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'cvv'];
    const sanitizedBody = { ...req.body };
    
    sensitiveFields.forEach(field => {
      if (sanitizedBody[field]) {
        sanitizedBody[field] = '[REDACTED]';
      }
    });

    logger.debug(`Request body for ${req.method} ${req.originalUrl}`, {
      body: sanitizedBody,
      requestId: req.requestId
    });
  }
  next();
};

/**
 * Error logging middleware - should be used after all routes
 */
export const errorLoggingMiddleware = (
  err: Error & { statusCode?: number; code?: string },
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.requestId || 'unknown';
  const duration = req.startTime ? Date.now() - req.startTime : 0;

  // Log the error with full context
  logger.error(`Request failed: ${req.method} ${req.originalUrl}`, err, {
    category: 'api',
    requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode: err.statusCode || 500,
    errorCode: err.code,
    duration,
    ip: req.ip,
    userId: (req as any).user?.id
  });

  // Pass to next error handler
  next(err);
};
