import express from 'express';

import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler, securityHeaders, corsForStripeWebhook, requestLogger, corsMiddleware } from './middlewares';
import { cookieParser } from './middlewares/cookies';
import { csrfProtect } from './middlewares/csrf';
import { routes } from './routes';
import { logger } from './utils';
import { config } from './config/config';

// Environment variables are loaded by the config module

// Create Express server
const app = express();
const port = config.server.port;

// Security middleware
app.use(helmet({
  // En dev, on assouplit; en prod, Helmet met les en-têtes par défaut (CSP minimale côté custom middleware)
  contentSecurityPolicy: config.server.isDev ? false : undefined,
  crossOriginEmbedderPolicy: config.server.isDev ? false : undefined,
}));
app.use(securityHeaders);
app.use(corsForStripeWebhook);

// Logging middleware
app.use(morgan('dev'));

// Enable CORS for all routes
app.use(corsMiddleware);
app.use(requestLogger);

// Rate limiting pour endpoints sensibles
import { apiLimiter } from './middlewares/rateLimiter';
app.use('/api/auth', apiLimiter);
app.use('/api/payment', apiLimiter);
app.use('/api/export', apiLimiter);
app.use('/api/scrape', apiLimiter);

// Special handling for Stripe webhook routes (support both paths for compatibilité)
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Cookies for all other routes
app.use(cookieParser);
// Body parsing middleware for all other routes
app.use(express.json());
// CSRF protection for state-changing requests
app.use(csrfProtect);

// Main routes
app.use('/api', routes);

// Health check endpoint (limité en production)
app.get('/health', (req, res) => {
  if (config.server.isDev) {
    return res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  }
  return res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use(errorHandler);

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Ne pas arrêter le serveur en cas d'erreur non capturée
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Ne pas arrêter le serveur en cas de promesse rejetée non gérée
});

// Start server
const server = app.listen(port, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
  logger.info(`Health check available at http://localhost:${port}/health`);
  
  // Afficher toutes les routes enregistrées de manière récursive
  if (config.server.isDev) {
    logger.info('Registered routes:');
    function printRoutes(stack: any[], parentPath: string) {
      stack.forEach((layer) => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
          logger.info(`  ${methods} ${parentPath}${layer.route.path}`);
        } else if (layer.name === 'router' && layer.handle.stack) {
          const newParentPath = parentPath + (layer.regexp.source.replace(/\//g, '/').replace('(?:\\?.*)?$', '').replace('^', '').slice(0, -1) || '');
          printRoutes(layer.handle.stack, newParentPath);
        }
      });
    }
    printRoutes(app._router.stack, '');
  }
});

// Gestion de l'arrêt du serveur
const gracefulShutdown = () => {
  logger.info('Shutting down server gracefully...');
  server.close(() => {
    logger.info('Server closed successfully');
    process.exit(0);
  });
  
  // Force l'arrêt après 10 secondes si la fermeture gracieuse échoue
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Écouter les signaux d'arrêt
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;
