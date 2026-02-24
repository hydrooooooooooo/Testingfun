import rateLimit from 'express-rate-limit';
import { logger } from '../utils';
import { audit } from '../utils/logger';
import { alertService } from '../services/alertService';

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
    audit('security.rate_limited', { ip: req.ip, method: req.method, url: req.originalUrl });
    void alertService.notify('security.rate_limited', { ip: req.ip, method: req.method, url: req.originalUrl });
    res.status(options.statusCode).send(options.message);
  },
});

/**
 * Stricter rate limiter for authentication-sensitive endpoints
 * (login, password reset, registration).
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Trop de tentatives. Veuillez réessayer dans 15 minutes.',
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`, {
      method: req.method,
      url: req.originalUrl,
    });
    audit('security.auth_rate_limited', { ip: req.ip, method: req.method, url: req.originalUrl });
    void alertService.notify('security.auth_rate_limited', { ip: req.ip, method: req.method, url: req.originalUrl });
    res.status(options.statusCode).send(options.message);
  },
});

/**
 * Rate limiter for admin endpoints
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Trop de requêtes admin.',
  handler: (req, res, next, options) => {
    audit('security.admin_rate_limited', { ip: req.ip, url: req.originalUrl });
    res.status(options.statusCode).send(options.message);
  },
});

/**
 * Stricter rate limiter for admin export endpoints
 */
export const adminExportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Trop d'exports.",
  handler: (req, res, next, options) => {
    audit('security.admin_export_rate_limited', { ip: req.ip });
    res.status(options.statusCode).send(options.message);
  },
});
