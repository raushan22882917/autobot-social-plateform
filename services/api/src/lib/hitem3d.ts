const DEFAULT_BASE = 'https://api.hitem3d.ai';

interface Hitem3DTokenData {
  accessToken: string;
  tokenType: string;
  nonce: string;
}

interface Hitem3DTokenResponse {
  code: number;
  message?: string;
  msg?: string;
  data: Hitem3DTokenData | Record<string, never>;
}

let cached: { token: Hitem3DTokenData; expiresAt: number } | null = null;

export function isHitem3DConfigured(): boolean {
  return Boolean(process.env.HITEM3D_CLIENT_ID && process.env.HITEM3D_CLIENT_SECRET);
}

export function getBaseUrl(): string {
  return (process.env.HITEM3D_API_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
}

export async function getHitem3DAccessToken(forceRefresh = false): Promise<Hitem3DTokenData> {
  if (!isHitem3DConfigured()) {
    throw new Error('Hitem3D is not configured. Set HITEM3D_CLIENT_ID and HITEM3D_CLIENT_SECRET in .env');
  }

  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const clientId = process.env.HITEM3D_CLIENT_ID!;
  const clientSecret = process.env.HITEM3D_CLIENT_SECRET!;
  const basic = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');

  const res = await fetch(`${getBaseUrl()}/open-api/v1/auth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: '{}',
  });

  const body = (await res.json()) as Hitem3DTokenResponse;
  const ok = body.code === 200 && body.data && 'accessToken' in body.data;

  if (!ok) {
    const msg = body.msg || body.message || 'Hitem3D authentication failed';
    throw new Error(msg);
  }

  const token = body.data as Hitem3DTokenData;
  cached = { token, expiresAt: Date.now() + 50 * 60 * 1000 };
  return token;
}

export async function testHitem3DConnection(): Promise<{ ok: boolean; message?: string }> {
  if (!isHitem3DConfigured()) {
    return { ok: false, message: 'HITEM3D_CLIENT_ID / HITEM3D_CLIENT_SECRET not set' };
  }
  try {
    await getHitem3DAccessToken(true);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
