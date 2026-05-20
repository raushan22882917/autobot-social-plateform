import jwt from 'jsonwebtoken';

export interface OAuthStatePayload {
  tenantId: string;
  userId: string;
  platform: string;
}

function getSecret(): string {
  return process.env.JWT_SECRET || 'autobot360-dev-secret-change-in-prod';
}

export function signOAuthState(payload: OAuthStatePayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: '15m' });
}

export function verifyOAuthState(state: string): OAuthStatePayload {
  const decoded = jwt.verify(state, getSecret()) as OAuthStatePayload;
  if (!decoded.tenantId || !decoded.userId || !decoded.platform) {
    throw new Error('Invalid OAuth state');
  }
  return decoded;
}
