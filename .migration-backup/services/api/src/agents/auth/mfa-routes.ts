import { Router } from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { db } from '../../lib/db';
import { authMiddleware, type AuthRequest } from '../../middleware/auth';

export const mfaRouter = Router();

function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }

  return codes;
}

// POST /api/v1/auth/mfa/setup - Initiate MFA setup
mfaRouter.post('/setup', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.uid;
    const email = req.user!.email;

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `AutoBot360 (${email})`,
      issuer: 'AutoBot360',
      length: 32,
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Store temporary setup data (expires in 10 minutes)
    const setupId = `mfa_setup_${userId}_${Date.now()}`;
    await db.set('mfa_setups', setupId, {
      id: setupId,
      userId,
      secret: secret.base32,
      backupCodes,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    res.json({
      setupId,
      qrCode,
      secret: secret.base32,
      backupCodes,
      manualEntryKey: secret.base32,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/mfa/verify - Verify TOTP token and enable MFA
mfaRouter.post('/verify', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { setupId, token } = req.body;
    const userId = req.user!.uid;

    if (!setupId || !token) {
      return res.status(400).json({ error: { message: 'setupId and token required' } });
    }

    // Get setup data
    const setup = await db.get('mfa_setups', setupId);

    if (!setup || setup.userId !== userId) {
      return res.status(400).json({ error: { message: 'Invalid setup ID' } });
    }

    if (new Date() > new Date(setup.expiresAt)) {
      return res.status(400).json({ error: { message: 'Setup expired' } });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: setup.secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ error: { message: 'Invalid token' } });
    }

    // Hash backup codes
    const hashedBackupCodes = setup.backupCodes.map((code: string) =>
      crypto.createHash('sha256').update(code).digest('hex')
    );

    // Enable MFA on user
    await db.update('users', userId, {
      mfaEnabled: true,
      mfaSecret: setup.secret,
      mfaBackupCodes: hashedBackupCodes,
      mfaEnabledAt: new Date().toISOString(),
    });

    // Delete setup data
    await db.delete('mfa_setups', setupId);

    res.json({
      message: 'MFA enabled successfully',
      backupCodes: setup.backupCodes,
      warning: 'Save these backup codes in a safe place. You can use them to access your account if you lose access to your authenticator app.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/mfa/disable - Disable MFA
mfaRouter.post('/disable', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { password, token } = req.body;
    const userId = req.user!.uid;

    if (!password || !token) {
      return res.status(400).json({ error: { message: 'password and token required' } });
    }

    // Get user
    const user = await db.get('users', userId);

    if (!user.mfaEnabled) {
      return res.status(400).json({ error: { message: 'MFA not enabled' } });
    }

    // Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ error: { message: 'Invalid token' } });
    }

    // Disable MFA
    await db.update('users', userId, {
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: null,
    });

    res.json({ message: 'MFA disabled' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/mfa/verify-login - Verify MFA token during login
mfaRouter.post('/verify-login', async (req: AuthRequest, res, next) => {
  try {
    const { userId, token, backupCode } = req.body;

    if (!userId || (!token && !backupCode)) {
      return res.status(400).json({ error: { message: 'userId and token or backupCode required' } });
    }

    const user = await db.get('users', userId);

    if (!user || !user.mfaEnabled) {
      return res.status(400).json({ error: { message: 'MFA not enabled for this user' } });
    }

    let verified = false;

    if (token) {
      // Verify TOTP token
      verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token,
        window: 2,
      });
    } else if (backupCode) {
      // Verify backup code
      const hashedBackupCode = crypto.createHash('sha256').update(backupCode).digest('hex');
      const codeIndex = user.mfaBackupCodes.indexOf(hashedBackupCode);

      if (codeIndex !== -1) {
        verified = true;

        // Remove used backup code
        user.mfaBackupCodes.splice(codeIndex, 1);
        await db.update('users', userId, { mfaBackupCodes: user.mfaBackupCodes });
      }
    }

    if (!verified) {
      return res.status(400).json({ error: { message: 'Invalid token or backup code' } });
    }

    res.json({ verified: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/mfa/status - Get MFA status
mfaRouter.get('/status', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await db.get('users', req.user!.uid);

    res.json({
      mfaEnabled: user.mfaEnabled || false,
      mfaEnabledAt: user.mfaEnabledAt,
      backupCodesRemaining: user.mfaBackupCodes?.length || 0,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/mfa/regenerate-backup-codes - Generate new backup codes
mfaRouter.post('/regenerate-backup-codes', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { token } = req.body;
    const userId = req.user!.uid;

    if (!token) {
      return res.status(400).json({ error: { message: 'token required' } });
    }

    const user = await db.get('users', userId);

    if (!user.mfaEnabled) {
      return res.status(400).json({ error: { message: 'MFA not enabled' } });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ error: { message: 'Invalid token' } });
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(code =>
      crypto.createHash('sha256').update(code).digest('hex')
    );

    // Update user
    await db.update('users', userId, { mfaBackupCodes: hashedBackupCodes });

    res.json({
      backupCodes,
      warning: 'Save these backup codes in a safe place. Your old backup codes are no longer valid.',
    });
  } catch (err) {
    next(err);
  }
});
