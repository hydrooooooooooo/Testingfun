import rateLimit from 'express-rate-limit';
import { logger } from '../utils';

/**
 * Configure le middleware de limitation de débit pour protéger contre les attaques par force brute.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite chaque IP à 100 requêtes par fenêtre (par 15 minutes)
  standardHeaders: true, // Retourne les informations de limite de débit dans les en-têtes `RateLimit-*`
  legacyHeaders: false, // Désactive les en-têtes `X-RateLimit-*`
  message: 'Trop de requêtes envoyées depuis cette IP, veuillez réessayer après 15 minutes.',
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      method: req.method,
      url: req.originalUrl,
    });
    res.status(options.statusCode).send(options.message);
  },
});
