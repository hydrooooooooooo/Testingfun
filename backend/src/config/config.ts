import dotenv from 'dotenv';
import { logger } from '../utils/logger';

// Load environment variables from .env file
const nodeEnv = process.env.NODE_ENV || 'development';
const envPath = nodeEnv === 'production' ? '.env.production' : '.env';
dotenv.config({ path: envPath });

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
  
  // Mail configuration (SMTP)
  mail: {
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT || 25),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || Number(process.env.SMTP_PORT) === 465,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromEmail: process.env.SMTP_FROM || process.env.SMTP_USER,
    fromName: process.env.SMTP_FROM_NAME || 'EasyScrapy',
    replyTo: process.env.SMTP_REPLY_TO,
    tlsRejectUnauthorized: String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || '').toLowerCase() !== 'false',
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