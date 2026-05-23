import { isGeminiConfigured } from './gemini';
import { uploadStudioMediaFile } from './studio-media-storage';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error('Gemini API key not configured. Set GEMINI_API_KEY in services/api/.env');
  return key;
}

function imageModel(): string {
  return process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';
}

function veoModel(): string {
  return process.env.GEMINI_VEO_MODEL || 'veo-3.1-generate-preview';
}

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType: string; data: string };
};

type GenerateContentResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; inlineData?: { mimeType?: string; data?: string } }> };
  }>;
  error?: { message?: string };
};

export async function fetchUrlAsBuffer(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`Failed to download media (${res.status})`);
  const mimeType = res.headers.get('content-type') || 'application/octet-stream';
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, mimeType };
}

async function fetchUrlAsBase64(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    if (url.startsWith('data:')) {
      const match = url.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return null;
      return { mimeType: match[1], data: match[2] };
    }
    const { buffer, mimeType } = await fetchUrlAsBuffer(url);
    return { mimeType: mimeType.split(';')[0], data: buffer.toString('base64') };
  } catch {
    return null;
  }
}

function extractImageBase64(data: GenerateContentResponse): { mimeType: string; data: string } | null {
  for (const part of data.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data) {
      return {
        mimeType: part.inlineData.mimeType || 'image/png',
        data: part.inlineData.data,
      };
    }
  }
  return null;
}

async function geminiGenerateContent(
  model: string,
  parts: GeminiPart[],
  generationConfig: Record<string, unknown>
): Promise<GenerateContentResponse> {
  const apiKey = getApiKey();
  const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig,
    }),
  });
  const data = (await res.json()) as GenerateContentResponse & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini request failed (${res.status})`);
  }
  return data;
}

async function persistImageBuffer(
  tenantId: string,
  buffer: Buffer,
  mimeType: string,
  name: string
): Promise<{ url: string; type: 'image' }> {
  return uploadStudioMediaFile(tenantId, buffer, mimeType, name);
}

async function persistRemoteFile(
  tenantId: string,
  sourceUrl: string,
  name: string,
  type: 'image' | 'video'
): Promise<{ url: string; type: 'image' | 'video' }> {
  const apiKey = getApiKey();
  const res = await fetch(sourceUrl, {
    headers: { 'x-goog-api-key': apiKey },
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`Failed to download generated ${type} (${res.status})`);
  const mimeType = res.headers.get('content-type') || (type === 'video' ? 'video/mp4' : 'image/png');
  const buffer = Buffer.from(await res.arrayBuffer());
  return uploadStudioMediaFile(tenantId, buffer, mimeType, name);
}

export async function generateGeminiImage(
  tenantId: string,
  prompt: string,
  aspectRatio: string = '1:1'
): Promise<{ url: string; type: 'image'; name: string }> {
  if (!isGeminiConfigured()) throw new Error('Gemini not configured — set GEMINI_API_KEY');

  const model = imageModel();
  const data = await geminiGenerateContent(
    model,
    [{ text: prompt }],
    {
      responseModalities: ['TEXT', 'IMAGE'],
      responseFormat: { image: { aspectRatio } },
    }
  );

  const img = extractImageBase64(data);
  if (!img) throw new Error('Gemini did not return an image. Try a different prompt or model.');

  const buffer = Buffer.from(img.data, 'base64');
  const uploaded = await persistImageBuffer(tenantId, buffer, img.mimeType, `gemini-gen-${Date.now()}.png`);
  return { ...uploaded, name: 'AI generated image' };
}

export async function enhanceGeminiImage(
  tenantId: string,
  imageUrl: string,
  prompt: string
): Promise<{ url: string; type: 'image'; name: string }> {
  if (!isGeminiConfigured()) throw new Error('Gemini not configured — set GEMINI_API_KEY');

  const source = await fetchUrlAsBase64(imageUrl);
  if (!source) throw new Error('Could not load source image for enhancement');

  const instruction =
    prompt.trim() ||
    'Enhance this product photo for social commerce: better lighting, sharp details, clean background, professional look. Keep the product recognizable.';

  const model = imageModel();
  const data = await geminiGenerateContent(
    model,
    [
      { text: instruction },
      { inlineData: { mimeType: source.mimeType, data: source.data } },
    ],
    { responseModalities: ['TEXT', 'IMAGE'] }
  );

  const img = extractImageBase64(data);
  if (!img) throw new Error('Gemini did not return an enhanced image.');

  const buffer = Buffer.from(img.data, 'base64');
  const uploaded = await persistImageBuffer(tenantId, buffer, img.mimeType, `gemini-enhanced-${Date.now()}.png`);
  return { ...uploaded, name: 'AI enhanced image' };
}

async function pollGeminiOperation(operationName: string, maxWaitMs = 300000): Promise<Record<string, unknown>> {
  const apiKey = getApiKey();
  const path = operationName.startsWith('operations/') ? operationName : `operations/${operationName}`;
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    const res = await fetch(`${GEMINI_BASE}/${path}?key=${apiKey}`);
    const data = (await res.json()) as {
      done?: boolean;
      error?: { message?: string };
      response?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    };

    if (!res.ok) {
      throw new Error((data as { error?: { message?: string } }).error?.message || 'Operation poll failed');
    }
    if (data.error?.message) throw new Error(data.error.message);
    if (data.done) return data.response || data;

    await new Promise((r) => setTimeout(r, 8000));
  }

  throw new Error('Video generation timed out. Try again with a shorter prompt.');
}

function extractVideoUri(payload: Record<string, unknown>): string | null {
  const generated = payload.generateVideoResponse as { generatedSamples?: Array<{ video?: { uri?: string } }> };
  const uri = generated?.generatedSamples?.[0]?.video?.uri;
  if (uri) return uri;

  const samples = payload.generatedSamples as Array<{ video?: { uri?: string } }> | undefined;
  if (samples?.[0]?.video?.uri) return samples[0].video!.uri!;

  const predictions = payload.predictions as Array<{ videoUri?: string; uri?: string }> | undefined;
  if (predictions?.[0]?.videoUri) return predictions[0].videoUri;
  if (predictions?.[0]?.uri) return predictions[0].uri;

  return null;
}

export async function generateVeoVideo(
  tenantId: string,
  prompt: string,
  options?: { imageUrl?: string; aspectRatio?: string }
): Promise<{ url: string; type: 'video'; name: string }> {
  if (!isGeminiConfigured()) throw new Error('Gemini not configured — set GEMINI_API_KEY');

  const model = veoModel();
  const instance: Record<string, unknown> = { prompt };

  if (options?.imageUrl) {
    const img = await fetchUrlAsBase64(options.imageUrl);
    if (img) {
      instance.image = { bytesBase64Encoded: img.data, mimeType: img.mimeType };
    }
  }

  const parameters: Record<string, unknown> = {
    aspectRatio: options?.aspectRatio === '9:16' ? '9:16' : '16:9',
    sampleCount: 1,
  };

  const apiKey = getApiKey();
  const startRes = await fetch(`${GEMINI_BASE}/models/${model}:predictLongRunning?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instances: [instance], parameters }),
  });

  const startData = (await startRes.json()) as { name?: string; error?: { message?: string } };
  if (!startRes.ok) {
    throw new Error(
      startData.error?.message ||
        `Veo video generation failed (${startRes.status}). Ensure billing is enabled for Veo on your API key.`
    );
  }

  const opName = startData.name;
  if (!opName) throw new Error('Veo did not return an operation id');

  const result = await pollGeminiOperation(opName);
  const videoUri = extractVideoUri(result);
  if (!videoUri) {
    throw new Error('Veo completed but no video URL was returned. Check GEMINI_VEO_MODEL in .env.');
  }

  const uploaded = await persistRemoteFile(tenantId, videoUri, `veo-${Date.now()}.mp4`, 'video');
  return { ...uploaded, name: 'AI generated video' };
}

export function getGeminiMediaConfig() {
  return {
    imageModel: imageModel(),
    veoModel: veoModel(),
    configured: isGeminiConfigured(),
  };
}
