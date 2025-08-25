import cors from 'cors';
import { config } from '../config/config';

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow no-origin requests (e.g., curl, mobile apps)
    if (!origin) return callback(null, true);
    const allowed = config.cors.allowedOrigins || [];
    if (allowed.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS not allowed for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'Expires',
    'Origin',
    'X-Requested-With',
    'Accept',
    'X-CSRF-Token',
  ],
  exposedHeaders: ['Content-Length', 'Content-Type', 'Content-Disposition'],
  maxAge: 86400, // 24 hours
};

export const corsMiddleware = cors(corsOptions);
