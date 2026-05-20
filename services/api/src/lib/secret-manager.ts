import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();
const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;

if (!projectId) {
  console.warn('GCP_PROJECT_ID not configured. Secret Manager will not be available.');
}

/**
 * Get secret from GCP Secret Manager
 */
export async function getSecret(secretName: string): Promise<string> {
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID not configured');
  }

  try {
    const name = client.secretVersionPath(projectId, secretName, 'latest');
    const [version] = await client.accessSecretVersion({ name });

    const secretValue = version.payload?.data?.toString();

    if (!secretValue) {
      throw new Error(`Secret ${secretName} is empty`);
    }

    return secretValue;
  } catch (err) {
    console.error(`Failed to retrieve secret ${secretName}:`, err);
    throw err;
  }
}

/**
 * Create or update secret in GCP Secret Manager
 */
export async function setSecret(secretName: string, secretValue: string): Promise<void> {
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID not configured');
  }

  try {
    const parent = client.projectPath(projectId);

    // Try to get existing secret
    try {
      const existingSecret = await client.getSe cret({
        name: client.secretPath(projectId, secretName),
      });

      // Secret exists, add new version
      await client.addSecretVersion({
        parent: existingSecret.name,
        payload: { data: Buffer.from(secretValue) },
      });

      console.log(`Updated secret version: ${secretName}`);
    } catch (err: any) {
      if (err.code === 5) {
        // Secret doesn't exist, create it
        const [secret] = await client.createSecret({
          parent,
          secretId: secretName,
          secret: { replication: { automatic: {} } },
        });

        await client.addSecretVersion({
          parent: secret.name,
          payload: { data: Buffer.from(secretValue) },
        });

        console.log(`Created new secret: ${secretName}`);
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error(`Failed to set secret ${secretName}:`, err);
    throw err;
  }
}

/**
 * Delete secret from GCP Secret Manager
 */
export async function deleteSecret(secretName: string): Promise<void> {
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID not configured');
  }

  try {
    const name = client.secretPath(projectId, secretName);
    await client.deleteSecret({ name });

    console.log(`Deleted secret: ${secretName}`);
  } catch (err) {
    console.error(`Failed to delete secret ${secretName}:`, err);
    throw err;
  }
}

/**
 * List all secrets
 */
export async function listSecrets(): Promise<string[]> {
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID not configured');
  }

  try {
    const parent = client.projectPath(projectId);
    const [secrets] = await client.listSecrets({ parent });

    return secrets.map(secret => secret.name?.split('/').pop() || '').filter(Boolean);
  } catch (err) {
    console.error('Failed to list secrets:', err);
    throw err;
  }
}

/**
 * Get cached secret (with in-memory cache)
 */
const secretCache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getCachedSecret(secretName: string): Promise<string> {
  const cached = secretCache.get(secretName);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = await getSecret(secretName);

  secretCache.set(secretName, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return value;
}

/**
 * Clear secret cache
 */
export function clearSecretCache(secretName?: string): void {
  if (secretName) {
    secretCache.delete(secretName);
  } else {
    secretCache.clear();
  }
}

/**
 * Rotate secret (create new version)
 */
export async function rotateSecret(secretName: string, newValue: string): Promise<void> {
  await setSecret(secretName, newValue);
  clearSecretCache(secretName);
  console.log(`Rotated secret: ${secretName}`);
}
