import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config/config';

/**
 * Middleware to add security headers
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Pour export/preview: en dev on assouplit; en prod on garde des headers sûrs
  const isExportOrPreview = req.path.startsWith('/api/export') || req.path.startsWith('/api/preview');
  if (isExportOrPreview && config.server.isDev) {
    // Dev: limiter au minimum
    res.setHeader('X-Content-Type-Options', 'nosniff');
    logger.info(`Désactivation partielle des en-têtes de sécurité (dev) pour ${req.path}`);
    next();
    return;
  }

  // Page HTML de réinitialisation du mot de passe: autoriser style/JS inline pour le rendu UI
  if (req.path.startsWith('/api/auth/reset-password/')) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // CSP spécifique: autoriser styles et scripts inline UNIQUEMENT pour cette page
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data: https: http:; connect-src 'self' https: http:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'"
    );
    next();
    return;
  }
  
  // Set security headers for other routes
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // CSP par défaut (plus stricte en production)
  if (config.server.isDev) {
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; connect-src 'self' https:");
  } else {
    // Pas de inline script/style en prod
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'");
  }
  
  next();
};

/**
 * Middleware to handle CORS for specific routes
 */
export const corsForStripeWebhook = (req: Request, res: Response, next: NextFunction) => {
  // Special handling for Stripe webhook
  if (req.path === '/api/payment/webhook') {
    // Stripe webhooks don't need CORS headers
    next();
    return;
  }
  
  // Configuration CORS spéciale pour les routes d'export et preview
  if (req.path.startsWith('/api/export') || req.path.startsWith('/api/preview') || req.path.startsWith('/api/verify-payment')) {
    const allowedOrigins = config.cors.allowedOrigins;
    const origin = req.headers.origin as string | undefined;
    if (config.server.isDev) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    } else {
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else if (allowedOrigins[0]) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
      }
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, Cache-Control, Pragma, Expires, Origin, X-Requested-With, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length');
    
    // Log pour débogage
    logger.info(`Configuration CORS spéciale appliquée pour ${req.path}`);
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    next();
    return;
  }
  
  // Set CORS headers for other routes
  const allowedOrigins = config.cors.allowedOrigins;
  
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // En développement, on est plus permissif
    if (config.server.isDev) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
    }
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  if (!config.server.isDev) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
};

/**
 * Middleware to log requests
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};
