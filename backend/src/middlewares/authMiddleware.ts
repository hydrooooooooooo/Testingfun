import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';

// Étendre le type Request de Express pour inclure notre propriété `user`
export interface AuthenticatedRequest extends Request {
  user?: { 
    id: number; 
    email: string; 
    role: string 
  };
}

export const protect = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Récupérer le token de l'en-tête (Bearer TOKEN)
      token = req.headers.authorization.split(' ')[1];

      // Vérifier le token
      const decoded = jwt.verify(token, config.api.jwtSecret as string) as { userId: number; email: string; role: string };

      // Attacher le payload de l'utilisateur à la requête en mappant correctement les champs
      req.user = { 
        id: decoded.userId, // Mapper userId vers id
        email: decoded.email, 
        role: decoded.role 
      };

      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Middleware optionnel pour restreindre l'accès à certains rôles
export const restrictTo = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
};
