import { Request, Response, NextFunction } from 'express';

// Allow only the configured ADMIN_EMAIL to access full admin dashboard
export function adminOwnerOnly(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as { email?: string } | undefined;
  const allowed = process.env.ADMIN_EMAIL;
  if (!user || !user.email || !allowed || user.email.toLowerCase() !== allowed.toLowerCase()) {
    return res.status(403).json({ status: 'fail', message: 'Access restricted to the owner admin account.' });
  }
  next();
}
