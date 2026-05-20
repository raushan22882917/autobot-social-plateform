import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.flatten().fieldErrors },
    });
  }

  const multerError = err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'LIMIT_FILE_SIZE';
  if (multerError) {
    return res.status(413).json({
      error: { code: 'FILE_TOO_LARGE', message: 'File too large. Videos max 100MB, images max 10MB.' },
    });
  }

  const payloadTooLarge =
    (err as { type?: string }).type === 'entity.too.large' ||
    (err instanceof Error && err.message.includes('request entity too large'));
  if (payloadTooLarge) {
    return res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message:
          'Request body is too large. Studio saves only public https image URLs — local uploads are for preview. Add product images with https URLs for publishing.',
      },
    });
  }

  const message = err instanceof Error ? err.message : 'Unknown error';
  console.error(JSON.stringify({ level: 'error', message, stack: err instanceof Error ? err.stack : undefined }));

  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: process.env.NODE_ENV === 'development' ? message : 'An unexpected error occurred' },
  });
}
