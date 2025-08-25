import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';

// Generate a random token
export const generateCsrfToken = () => crypto.randomBytes(24).toString('hex');

// Issue a CSRF token cookie and return the token in JSON
export const issueCsrfToken = (req: Request, res: Response) => {
  const token = generateCsrfToken();
  const isSecure = req.protocol === 'https' || (req.get('x-forwarded-proto') || '').includes('https');
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: 'strict',
    secure: isSecure,
    path: '/',
    maxAge: 60 * 60 * 1000, // 1h
  });
  return res.status(200).json({ csrfToken: token });
};

// Validate CSRF for mutating requests using double-submit cookie strategy
export const csrfProtect = (req: Request, res: Response, next: NextFunction) => {
  const method = req.method.toUpperCase();
  // Only protect state-changing methods
  const needsProtection = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (!needsProtection) return next();

  // Allow listed paths (webhooks, auth flows) to bypass
  const path = req.path;
  if (
    path.startsWith('/api/payment/webhook') ||
    path.startsWith('/api/stripe/webhook') ||
    path.startsWith('/api/auth/login') ||
    path.startsWith('/api/auth/register') ||
    path.startsWith('/api/auth/reset-password') ||
    path.startsWith('/api/auth/request-password-reset') ||
    path.startsWith('/api/auth/verify-email')
  ) {
    return next();
  }

  const headerToken = (req.headers[CSRF_HEADER] as string) || (req.headers[CSRF_HEADER.toUpperCase()] as string);
  const cookieToken = (req as any).cookies?.[CSRF_COOKIE];
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }
  return next();
};

