import { db } from './db';
import { publishEvent } from './pubsub';

/**
 * Check for expiring social media tokens and schedule refresh
 */
export async function checkExpiringTokens(): Promise<number> {
  try {
    // Get all social accounts
    const accounts = await db.query('social_accounts', {
      filters: [
        {
          field: 'expiresAt',
          op: '<',
          value: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        },
      ],
      limit: 1000,
    });

    let refreshed = 0;

    for (const account of accounts) {
      // Skip if already scheduled for refresh
      if (account.refreshScheduled) {
        continue;
      }

      // Publish token refresh event
      await publishEvent('token.expiring', {
        tenantId: account.tenantId,
        accountId: account.id,
        platform: account.platform,
        expiresAt: account.expiresAt,
        daysUntilExpiry: Math.ceil(
          (new Date(account.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        ),
      });

      // Mark as scheduled
      await db.update('social_accounts', account.id, {
        refreshScheduled: true,
        refreshScheduledAt: new Date().toISOString(),
      });

      refreshed++;
    }

    console.log(`Checked ${accounts.length} accounts, scheduled ${refreshed} for refresh`);
    return refreshed;
  } catch (err) {
    console.error('Failed to check expiring tokens:', err);
    return 0;
  }
}

/**
 * Process token refresh (called by n8n workflow)
 */
export async function processTokenRefresh(tenantId: string, accountId: string, platform: string): Promise<boolean> {
  try {
    const account = await db.get('social_accounts', accountId);

    if (!account || account.tenantId !== tenantId) {
      console.error(`Account not found: ${accountId}`);
      return false;
    }

    // Publish refresh event to n8n
    await publishEvent('token.refresh_requested', {
      tenantId,
      accountId,
      platform,
      currentExpiresAt: account.expiresAt,
    });

    console.log(`Token refresh requested for ${platform} account ${accountId}`);
    return true;
  } catch (err) {
    console.error('Failed to process token refresh:', err);
    return false;
  }
}

/**
 * Update token after successful refresh
 */
export async function updateRefreshedToken(
  accountId: string,
  newToken: string,
  newExpiresAt: string
): Promise<boolean> {
  try {
    const account = await db.get('social_accounts', accountId);

    if (!account) {
      console.error(`Account not found: ${accountId}`);
      return false;
    }

    // Store encrypted token in Secret Manager
    const secretName = `social-token-${account.tenantId}-${accountId}`;

    // TODO: Encrypt and store in Secret Manager
    // await setSecret(secretName, newToken);

    // Update account metadata
    await db.update('social_accounts', accountId, {
      expiresAt: newExpiresAt,
      refreshScheduled: false,
      lastRefreshedAt: new Date().toISOString(),
      tokenVersion: (account.tokenVersion || 0) + 1,
    });

    console.log(`Token refreshed for account ${accountId}, expires at ${newExpiresAt}`);
    return true;
  } catch (err) {
    console.error('Failed to update refreshed token:', err);
    return false;
  }
}

/**
 * Handle token refresh failure
 */
export async function handleTokenRefreshFailure(
  accountId: string,
  error: string
): Promise<void> {
  try {
    const account = await db.get('social_accounts', accountId);

    if (!account) {
      return;
    }

    // Update account with error
    await db.update('social_accounts', accountId, {
      refreshScheduled: false,
      lastRefreshError: error,
      lastRefreshErrorAt: new Date().toISOString(),
      refreshFailureCount: (account.refreshFailureCount || 0) + 1,
    });

    // If too many failures, mark account as disconnected
    if ((account.refreshFailureCount || 0) >= 3) {
      await db.update('social_accounts', accountId, {
        status: 'disconnected',
        disconnectedReason: 'Token refresh failed multiple times',
      });

      // Publish event
      await publishEvent('social_account.disconnected', {
        tenantId: account.tenantId,
        accountId,
        platform: account.platform,
        reason: 'Token refresh failed',
      });
    }

    console.error(`Token refresh failed for account ${accountId}: ${error}`);
  } catch (err) {
    console.error('Failed to handle token refresh failure:', err);
  }
}

/**
 * Schedule token refresh check (run every 24 hours)
 */
export function scheduleTokenRefreshCheck(): void {
  // Run immediately on startup
  checkExpiringTokens().catch(err => console.error('Initial token check failed:', err));

  // Run every 24 hours
  setInterval(() => {
    checkExpiringTokens().catch(err => console.error('Token check failed:', err));
  }, 24 * 60 * 60 * 1000);

  console.log('Token refresh scheduler started');
}

/**
 * Get token expiry status for a tenant
 */
export async function getTokenExpiryStatus(tenantId: string): Promise<any> {
  try {
    const accounts = await db.query('social_accounts', {
      filters: [{ field: 'tenantId', op: '==', value: tenantId }],
    });

    const status = {
      total: accounts.length,
      active: accounts.filter(a => a.status === 'active').length,
      disconnected: accounts.filter(a => a.status === 'disconnected').length,
      expiringIn7Days: 0,
      expiringIn24Hours: 0,
      expired: 0,
    };

    const now = Date.now();
    const in7Days = now + 7 * 24 * 60 * 60 * 1000;
    const in24Hours = now + 24 * 60 * 60 * 1000;

    accounts.forEach(account => {
      const expiresAt = new Date(account.expiresAt).getTime();

      if (expiresAt < now) {
        status.expired++;
      } else if (expiresAt < in24Hours) {
        status.expiringIn24Hours++;
      } else if (expiresAt < in7Days) {
        status.expiringIn7Days++;
      }
    });

    return status;
  } catch (err) {
    console.error('Failed to get token expiry status:', err);
    return null;
  }
}
