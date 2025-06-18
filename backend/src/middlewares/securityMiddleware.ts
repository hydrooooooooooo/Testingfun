import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config/config';

/**
 * Middleware to add security headers
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Pour les routes d'export et preview, on n'applique pas les en-têtes de sécurité restrictifs
  if (req.path.startsWith('/api/export') || req.path.startsWith('/api/preview')) {
    // Uniquement l'en-tête de base pour éviter le reniflage de type MIME
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Log pour débogage
    logger.info(`Désactivation des en-têtes de sécurité restrictifs pour ${req.path}`);
    
    next();
    return;
  }
  
  // Set security headers for other routes
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // CSP plus permissif pour permettre les requêtes externes et les images
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; connect-src 'self' https:");
  
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
  if (req.path.startsWith('/api/export') || req.path.startsWith('/api/preview')) {
    // Pour les exports et previews, on autorise toutes les origines
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    
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
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
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
