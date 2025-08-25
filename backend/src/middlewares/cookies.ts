import { Request, Response, NextFunction } from 'express';

export const cookieParser = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.cookie;
  const cookies: Record<string, string> = {};
  if (header) {
    header.split(';').forEach(part => {
      const idx = part.indexOf('=');
      if (idx > -1) {
        const key = decodeURIComponent(part.slice(0, idx).trim());
        const val = decodeURIComponent(part.slice(idx + 1).trim());
        cookies[key] = val;
      }
    });
  }
  (req as any).cookies = cookies;
  next();
};
