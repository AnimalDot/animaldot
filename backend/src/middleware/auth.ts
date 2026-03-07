import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.js';

export interface AuthLocals {
  userId: string;
  email: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid token' });
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    (req as Request & { auth: AuthLocals }).auth = { userId: payload.userId, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}
