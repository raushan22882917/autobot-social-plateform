export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error('Gemini API key not configured. Set GEMINI_API_KEY in services/api/.env');
  return key;
}

export interface StudioGenerateInput {
  productTitle: string;
  productDescription: string;
  price?: number;
  currency?: string;
  platforms: string[];
  tone?: string;
  customPrompt?: string;
  imageUrls?: string[];
}

export interface StudioGenerateResult {
  caption: string;
  hashtags: string[];
  cta: string;
  headline: string;
  platformVariants: Record<string, { caption: string; hashtags?: string[] }>;
  raw?: string;
}

const DEFAULT_MODEL = 'gemini-2.5-flash';

function getModelCandidates(): string[] {
  const preferred = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallbacks = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
  return [...new Set([preferred, ...fallbacks])];
}

function isRetryableGeminiError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('not found') ||
    lower.includes('not supported')
  );
}

async function fetchImageAsBase64(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    if (url.startsWith('data:')) {
      const match = url.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return null;
      return { mimeType: match[1], data: match[2] };
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mimeType = res.headers.get('content-type') || 'image/jpeg';
    return { mimeType, data: buf.toString('base64') };
  } catch {
    return null;
  }
}

export async function generateStudioPost(input: StudioGenerateInput): Promise<StudioGenerateResult> {
  const platforms = input.platforms.length ? input.platforms : ['instagram'];
  const prompt = `You are a social commerce copywriter for Indian D2C brands (INR pricing).

Product: ${input.productTitle}
Description: ${input.productDescription}
Price: ${input.currency || 'INR'} ${input.price ?? 'N/A'}
Tone: ${input.tone || 'engaging and sales-focused'}
Platforms: ${platforms.join(', ')}
${input.customPrompt ? `Extra instructions: ${input.customPrompt}` : ''}

Return ONLY valid JSON (no markdown fences) with this shape:
{
  "headline": "short hook",
  "caption": "main caption with emojis, 2-4 short paragraphs max",
  "hashtags": ["tag1", "tag2", ... up to 12 without # prefix],
  "cta": "call to action line",
  "platformVariants": {
    "${platforms[0]}": { "caption": "platform-specific caption", "hashtags": ["..."] }
  }
}

Include a platformVariants entry for each platform: ${platforms.join(', ')}.`;

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [{ text: prompt }];

  for (const url of (input.imageUrls || []).slice(0, 4)) {
    const img = await fetchImageAsBase64(url);
    if (img) parts.push({ inlineData: img });
  }

  const apiKey = getApiKey();
  const body = JSON.stringify({
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.85, maxOutputTokens: 2048 },
  });

  let lastError = 'Gemini request failed';
  for (const model of getModelCandidates()) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
    );

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      lastError = data.error?.message || lastError;
      if (isRetryableGeminiError(lastError)) continue;
      throw new Error(lastError);
    }

    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    return parseGeminiJson(text, platforms);
  }

  throw new Error(lastError);
}

/** Lightweight ping for Studio connection status */
export async function testGeminiConnection(): Promise<{ ok: boolean; model?: string; message?: string }> {
  if (!isGeminiConfigured()) {
    return { ok: false, message: 'GEMINI_API_KEY not set' };
  }
  const apiKey = getApiKey();
  for (const model of getModelCandidates()) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: OK' }] }],
            generationConfig: { maxOutputTokens: 8 },
          }),
        }
      );
      const data = (await res.json()) as { error?: { message?: string } };
      if (res.ok) return { ok: true, model };
      const msg = data.error?.message || 'Request failed';
      if (isRetryableGeminiError(msg)) continue;
      return { ok: false, message: msg };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  }
  return { ok: false, message: 'All configured Gemini models unavailable (check quota or billing)' };
}

function parseGeminiJson(text: string, platforms: string[]): StudioGenerateResult {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as StudioGenerateResult;
    return {
      caption: parsed.caption || cleaned,
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
      cta: parsed.cta || 'Shop now — link in bio',
      headline: parsed.headline || '',
      platformVariants: parsed.platformVariants || {},
      raw: text,
    };
  } catch {
    return {
      caption: cleaned,
      hashtags: [],
      cta: 'Shop now',
      headline: '',
      platformVariants: Object.fromEntries(platforms.map((p) => [p, { caption: cleaned }])),
      raw: text,
    };
  }
}
