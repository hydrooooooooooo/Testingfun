import express from 'express';

import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler, securityHeaders, corsForStripeWebhook, requestLogger, corsMiddleware } from './middlewares';
import { routes } from './routes';
import { logger } from './utils';
import { config } from './config/config';

// Environment variables are loaded by the config module

// Create Express server
const app = express();
const port = config.server.port;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Désactiver CSP pour le développement
  crossOriginEmbedderPolicy: false // Désactiver COEP pour le développement
}));
app.use(securityHeaders);
app.use(corsForStripeWebhook);

// Logging middleware
app.use(morgan('dev'));

// Enable CORS for all routes
app.use(corsMiddleware);
app.use(requestLogger);

// Special handling for Stripe webhook routes (support both paths for compatibilité)
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Body parsing middleware for all other routes
app.use(express.json());

// Main routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
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
  logger.info('Registered routes:');
  function printRoutes(stack: any[], parentPath: string) {
    stack.forEach((layer) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        logger.info(`  ${methods} ${parentPath}${layer.route.path}`);
      } else if (layer.name === 'router' && layer.handle.stack) {
        // C'est un routeur, on explore ses routes
        // On essaie de reconstruire le chemin du sous-routeur
        const newParentPath = parentPath + (layer.regexp.source.replace(/\//g, '/').replace('(?:\?.*)?$', '').replace('^', '').slice(0, -1) || '');
        printRoutes(layer.handle.stack, newParentPath);
      }
    });
  }
  printRoutes(app._router.stack, '');
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
