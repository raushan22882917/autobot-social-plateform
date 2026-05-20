import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import { authMiddleware, requireRole, type AuthRequest } from '../../middleware/auth';

export const apiKeysRouter = Router();

// Generate secure API key
function generateApiKey(): string {
  return `sk_${crypto.randomBytes(32).toString('hex')}`;
}

// Hash API key for storage
function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// POST /api/v1/settings/api-keys - Generate new API key
apiKeysRouter.post('/', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const { name, scopes = ['read'] } = req.body;
    const tenantId = req.user!.tenantId;

    if (!name) {
      return res.status(400).json({ error: { message: 'name required' } });
    }

    // Validate scopes
    const validScopes = ['read', 'write', 'admin'];
    if (!Array.isArray(scopes) || !scopes.every(s => validScopes.includes(s))) {
      return res.status(400).json({ error: { message: 'Invalid scopes' } });
    }

    // Generate API key
    const apiKey = generateApiKey();
    const hashedKey = hashApiKey(apiKey);

    // Store API key
    const keyId = `key_${uuidv4().slice(0, 8)}`;
    await db.set('api_keys', keyId, {
      id: keyId,
      tenantId,
      name,
      hashedKey,
      scopes,
      createdBy: req.user!.uid,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      usageCount: 0,
      status: 'active',
    });

    res.status(201).json({
      keyId,
      apiKey, // Only shown once
      name,
      scopes,
      createdAt: new Date().toISOString(),
      warning: 'Save this API key in a safe place. You will not be able to see it again.',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/settings/api-keys - List API keys
apiKeysRouter.get('/', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const keys = await db.query('api_keys', {
      filters: [{ field: 'tenantId', op: '==', value: tenantId }],
      orderBy: { field: 'createdAt', direction: 'desc' },
    });

    res.json({
      keys: keys.map(k => ({
        id: k.id,
        name: k.name,
        scopes: k.scopes,
        status: k.status,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        usageCount: k.usageCount,
        preview: `${k.hashedKey.slice(0, 8)}...`,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/settings/api-keys/:keyId - Get API key details
apiKeysRouter.get('/:keyId', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const key = await db.get('api_keys', req.params.keyId);

    if (!key || key.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'API key not found' } });
    }

    res.json({
      id: key.id,
      name: key.name,
      scopes: key.scopes,
      status: key.status,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      usageCount: key.usageCount,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/settings/api-keys/:keyId - Update API key
apiKeysRouter.put('/:keyId', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const { name, scopes, status } = req.body;
    const tenantId = req.user!.tenantId;

    const key = await db.get('api_keys', req.params.keyId);

    if (!key || key.tenantId !== tenantId) {
      return res.status(404).json({ error: { message: 'API key not found' } });
    }

    const updates: any = {};

    if (name) updates.name = name;
    if (scopes) {
      const validScopes = ['read', 'write', 'admin'];
      if (!Array.isArray(scopes) || !scopes.every(s => validScopes.includes(s))) {
        return res.status(400).json({ error: { message: 'Invalid scopes' } });
      }
      updates.scopes = scopes;
    }
    if (status && ['active', 'revoked'].includes(status)) {
      updates.status = status;
    }

    await db.update('api_keys', req.params.keyId, updates);

    res.json({ message: 'API key updated' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/settings/api-keys/:keyId - Revoke API key
apiKeysRouter.delete('/:keyId', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const key = await db.get('api_keys', req.params.keyId);

    if (!key || key.tenantId !== tenantId) {
      return res.status(404).json({ error: { message: 'API key not found' } });
    }

    await db.update('api_keys', req.params.keyId, { status: 'revoked' });

    res.json({ message: 'API key revoked' });
  } catch (err) {
    next(err);
  }
});

// Middleware to validate API key
export async function validateApiKey(req: any, res: any, next: any) {
  const authHeader = req.get('Authorization');

  if (!authHeader?.startsWith('Bearer sk_')) {
    return next();
  }

  const apiKey = authHeader.slice(7);
  const hashedKey = hashApiKey(apiKey);

  try {
    const keys = await db.query('api_keys', {
      filters: [
        { field: 'hashedKey', op: '==', value: hashedKey },
        { field: 'status', op: '==', value: 'active' },
      ],
    });

    if (keys.length === 0) {
      return res.status(401).json({ error: { message: 'Invalid API key' } });
    }

    const key = keys[0];

    // Update usage
    await db.update('api_keys', key.id, {
      lastUsedAt: new Date().toISOString(),
      usageCount: (key.usageCount || 0) + 1,
    });

    // Attach key info to request
    req.apiKey = key;
    req.user = {
      tenantId: key.tenantId,
      uid: 'api-key',
      role: 'api',
      scopes: key.scopes,
    };

    next();
  } catch (err) {
    console.error('API key validation failed:', err);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
}

// Middleware to check API key scopes
export function requireApiKeyScope(...scopes: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.apiKey) {
      return next();
    }

    const hasScope = scopes.some(scope => req.apiKey.scopes.includes(scope));

    if (!hasScope) {
      return res.status(403).json({
        error: {
          message: 'API key does not have required scopes',
          required: scopes,
          available: req.apiKey.scopes,
        },
      });
    }

    next();
  };
}
