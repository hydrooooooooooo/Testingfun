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
    apifyPagesInfoActorId: process.env.APIFY_PAGES_INFO_ACTOR_ID || 'apify/facebook-pages-scraper',
    apifyPagesPostsActorId: process.env.APIFY_PAGES_POSTS_ACTOR_ID || 'apify/facebook-posts-scraper',
    apifyCommentsActorId: process.env.APIFY_COMMENTS_ACTOR_ID || 'us5srxAYnsrkgUv2v',
  },

  // AI / OpenRouter configuration
  ai: {
    openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
    openRouterBaseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    defaultModel: process.env.AI_DEFAULT_MODEL || 'meta-llama/llama-3-8b-instruct',
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

  // Alerting configuration (Slack and/or Email)
  alerting: {
    enabled: String(process.env.ALERTS_ENABLED || '').toLowerCase() === 'true',
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
    emailTo: process.env.ALERT_EMAIL_TO,
    // Comma-separated list of events to alert on; defaults include critical ones
    events: (process.env.ALERT_EVENTS || 'stripe.webhook_verification_failed,security.rate_limited,export.denied_not_owner').split(',').map(s => s.trim()).filter(Boolean),
  },
  
  // CORS configuration
  cors: {
    allowedOrigins: [
      process.env.FRONTEND_URL || 'http://localhost:8080',
      'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:3001',
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