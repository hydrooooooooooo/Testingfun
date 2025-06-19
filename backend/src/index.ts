import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler, securityHeaders, corsForStripeWebhook, requestLogger } from './middlewares';
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

// Activer CORS explicitement avec une configuration très permissive pour résoudre les problèmes de téléchargement
app.use(cors({
  origin: '*', // Autoriser toutes les origines pour le développement
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires', 'Origin', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Type', 'Content-Disposition'],
  maxAge: 86400 // 24 heures
}));

// Middleware pour gérer les requêtes OPTIONS préflight
app.options('*', cors());
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
  
  // Afficher toutes les routes enregistrées
  logger.info('Registered routes:');
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      // Routes enregistrées directement
      logger.info(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          const path = handler.route.path;
          const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
          logger.info(`${methods} /api${path}`);
        }
      });
    }
  });
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
