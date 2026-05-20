import { randomUUID } from 'crypto';
import path from 'path';
import { initFirebaseAdmin } from './firebase-admin';
import { isDevStore } from './db';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export async function uploadStudioMediaFile(
  tenantId: string,
  buffer: Buffer,
  contentType: string,
  originalName: string
): Promise<{ url: string; type: 'image' | 'video' | 'model' }> {
  const isVideo = contentType.startsWith('video/');
  const isModel = contentType.includes('gltf') || contentType.includes('model');
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (buffer.length > maxBytes) {
    throw new Error(`File too large (max ${isVideo ? '100MB' : '10MB'})`);
  }

  if (isDevStore()) {
    throw new Error(
      'Media upload requires Firebase Storage. Set USE_DEV_STORE=false and add firebase-service-account.json.'
    );
  }

  const admin = initFirebaseAdmin();
  if (!admin) {
    throw new Error('Firebase Storage is not configured. Add firebase-service-account.json.');
  }

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error('FIREBASE_STORAGE_BUCKET is not set in API .env');
  }

  const ext = path.extname(originalName) || (isVideo ? '.mp4' : isModel ? '.glb' : '.jpg');
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const objectPath = `studio/${tenantId}/${randomUUID().slice(0, 12)}_${safeName}${ext}`;

  const bucket = admin.storage().bucket(bucketName);
  const file = bucket.file(objectPath);
  const downloadToken = randomUUID();

  await file.save(buffer, {
    metadata: {
      contentType,
      cacheControl: 'public, max-age=31536000',
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  const encodedPath = encodeURIComponent(objectPath);
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

  return { url, type: isVideo ? 'video' : isModel ? 'model' : 'image' };
}
