import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { audit } from '../utils/logger';

// Étendre le type Request de Express pour inclure notre propriété `user`
export interface AuthenticatedRequest extends Request {
  user?: { 
    id: number; 
    email: string; 
    role: string 
  };
}

export const protect = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // 1) Try cookie first
  token = (req as any).cookies?.['access_token'];

  // 2) Fallback to Authorization header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    audit('auth.missing_token', { path: req.path, ip: req.ip });
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, config.api.jwtSecret as string) as { userId: number; email: string; role: string };
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    audit('auth.token_invalid', { path: req.path, ip: req.ip });
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Middleware optionnel pour restreindre l'accès à certains rôles
export const restrictTo = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      audit('auth.forbidden_role', { path: req.path, ip: req.ip, rolesRequired: roles, user: req.user?.id });
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
};
