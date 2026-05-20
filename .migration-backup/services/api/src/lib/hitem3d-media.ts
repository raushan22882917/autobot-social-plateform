import { getHitem3DAccessToken, getBaseUrl, isHitem3DConfigured } from './hitem3d';
import { fetchUrlAsBuffer } from './gemini-media';
import { uploadStudioMediaFile } from './studio-media-storage';

export interface Hitem3DTaskResult {
  taskId: string;
  state: string;
  modelUrl?: string;
  coverUrl?: string;
}

async function hitemAuthHeader(): Promise<string> {
  const token = await getHitem3DAccessToken();
  return `Bearer ${token.accessToken}`;
}

export async function submitHitem3DImageTask(
  imageBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const auth = await hitemAuthHeader();
  const form = new FormData();
  const blob = new Blob([imageBuffer], { type: mimeType });
  form.append('images', blob, filename);
  form.append('request_type', '3');
  form.append('model', process.env.HITEM3D_MODEL || 'hitem3dv2.0');
  form.append('resolution', process.env.HITEM3D_RESOLUTION || '1024');
  form.append('format', '2');
  form.append('face', '800000');

  const res = await fetch(`${getBaseUrl()}/open-api/v1/submit-task`, {
    method: 'POST',
    headers: { Authorization: auth },
    body: form,
  });

  const body = (await res.json()) as {
    code?: number;
    data?: { task_id?: string };
    msg?: string;
    message?: string;
  };

  if (!res.ok || body.code !== 200 || !body.data?.task_id) {
    throw new Error(body.msg || body.message || `Hitem3D submit failed (${res.status})`);
  }

  return body.data.task_id;
}

export async function queryHitem3DTask(taskId: string): Promise<Hitem3DTaskResult> {
  const auth = await hitemAuthHeader();
  const qs = new URLSearchParams({ task_id: taskId });
  const res = await fetch(`${getBaseUrl()}/open-api/v1/query-task?${qs}`, {
    headers: { Authorization: auth, Accept: 'application/json' },
  });

  const body = (await res.json()) as {
    code?: number;
    data?: {
      task_id?: string;
      state?: string;
      url?: string;
      cover_url?: string;
    };
    msg?: string;
  };

  if (!res.ok || body.code !== 200 || !body.data) {
    throw new Error(body.msg || `Hitem3D query failed (${res.status})`);
  }

  return {
    taskId: body.data.task_id || taskId,
    state: body.data.state || 'unknown',
    modelUrl: body.data.url,
    coverUrl: body.data.cover_url,
  };
}

export async function pollHitem3DTask(taskId: string, maxWaitMs = 300000): Promise<Hitem3DTaskResult> {
  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    const result = await queryHitem3DTask(taskId);
    if (result.state === 'success') return result;
    if (result.state === 'failed') {
      throw new Error('Hitem3D could not generate the 3D model from this image. Try a clearer product photo.');
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('3D generation timed out. Check Hitem3D dashboard for task status.');
}

export async function convertImageTo3D(
  tenantId: string,
  imageUrl: string
): Promise<{
  model: { url: string; type: 'model'; name: string };
  preview?: { url: string; type: 'image'; name: string };
  taskId: string;
}> {
  if (!isHitem3DConfigured()) {
    throw new Error('Hitem3D is not configured. Set HITEM3D_CLIENT_ID and HITEM3D_CLIENT_SECRET in .env');
  }

  const { buffer, mimeType } = await fetchUrlAsBuffer(imageUrl);
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const taskId = await submitHitem3DImageTask(buffer, `product.${ext}`, mimeType);
  const result = await pollHitem3DTask(taskId);

  if (!result.modelUrl) throw new Error('3D model URL missing from Hitem3D response');

  const modelFile = await uploadStudioMediaFile(
    tenantId,
    Buffer.from(await (await fetch(result.modelUrl)).arrayBuffer()),
    'model/gltf-binary',
    `hitem3d-${Date.now()}.glb`
  );

  let preview: { url: string; type: 'image'; name: string } | undefined;
  if (result.coverUrl) {
    const cover = await uploadStudioMediaFile(
      tenantId,
      Buffer.from(await (await fetch(result.coverUrl)).arrayBuffer()),
      'image/webp',
      `hitem3d-cover-${Date.now()}.webp`
    );
    preview = { ...cover, name: '3D preview' };
  }

  return {
    taskId,
    model: { url: modelFile.url, type: 'model', name: '3D model (GLB)' },
    preview,
  };
}
