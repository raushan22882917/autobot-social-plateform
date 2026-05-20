import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  uid: string;
  tenantId: string;
  role: string;
  plan: string;
  email?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'autobot360-dev-secret-change-in-prod';
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.uid, tenantId: user.tenantId, role: user.role, plan: user.plan, email: user.email },
    getJwtSecret(),
    { expiresIn: '24h' }
  );
}

export function verifyToken(token: string): AuthUser {
  const decoded = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload;
  return {
    uid: decoded.sub as string,
    tenantId: decoded.tenantId as string,
    role: decoded.role as string,
    plan: decoded.plan as string,
    email: decoded.email as string | undefined,
  };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
  }

  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    next();
  };
}
