import dotenv from 'dotenv';
import { logger } from '../utils/logger';

// Load environment variables from .env file
dotenv.config();

/**
 * Application configuration
 * Centralizes all environment variables and provides defaults
 */
export const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8080', // CORRIGÉ
    backendUrl: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`,
    isDev: process.env.NODE_ENV !== 'production',
  },
  
  // API keys and secrets
  api: {
    apifyToken: process.env.APIFY_TOKEN,
    apifyActorId: process.env.APIFY_ACTOR_ID,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    adminApiKey: process.env.ADMIN_API_KEY,
    jwtSecret: process.env.JWT_SECRET,
  },
  
  // Session storage configuration
  session: {
    // Can be 'memory' or 'database'
    storage: process.env.SESSION_STORAGE || 'memory',
  },
  
  // Pricing configuration
  pricing: {
    // Price in euros
    standardPack: 9.99,
    premiumPack: 19.99,
    enterprisePack: 49.99,
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
  
  // CORS configuration
  cors: {
    allowedOrigins: [
      process.env.FRONTEND_URL || 'http://localhost:8080', // CORRIGÉ
      'http://localhost:8080', // AJOUTÉ - ton frontend
      'http://localhost:3001', // Ton backend
      'http://localhost:3000',
      'http://localhost:5173',
      'https://checkout.stripe.com',
    ],
  },
};

// DEBUG TEMPORAIRE - À SUPPRIMER APRÈS TEST
console.log('=== CONFIG DEBUG ===');
console.log('FRONTEND_URL from env:', process.env.FRONTEND_URL);
console.log('frontendUrl in config:', config.server.frontendUrl);
console.log('CORS origins:', config.cors.allowedOrigins);
console.log('===================');

// Validate required configuration
const validateConfig = () => {
  const requiredVars = [
    { key: 'APIFY_TOKEN', value: config.api.apifyToken },
    { key: 'STRIPE_SECRET_KEY', value: config.api.stripeSecretKey },
    { key: 'STRIPE_WEBHOOK_SECRET', value: config.api.stripeWebhookSecret },
    { key: 'ADMIN_API_KEY', value: config.api.adminApiKey },
    { key: 'JWT_SECRET', value: config.api.jwtSecret },
  ];
  
  const missingVars = requiredVars.filter(v => !v.value);
  
  if (missingVars.length > 0) {
    const missingKeys = missingVars.map(v => v.key).join(', ');
    logger.warn(`Missing required environment variables: ${missingKeys}`);
    
    if (config.server.env === 'production') {
      throw new Error(`Missing required environment variables: ${missingKeys}`);
    }
  }
};

// Validate configuration on import
validateConfig();

export default config;