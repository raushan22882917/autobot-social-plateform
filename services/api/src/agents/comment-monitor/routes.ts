import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import { authMiddleware, requireRole, type AuthRequest } from '../../middleware/auth';
import { publishEvent } from '../../lib/pubsub';

export const commentRouter = Router();

// GET /api/v1/comments - List comments
commentRouter.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { platform, status, postId, limit = 50, offset = 0 } = req.query;
    const tenantId = req.user!.tenantId;

    const filters: any[] = [{ field: 'tenantId', op: '==', value: tenantId }];

    if (platform) filters.push({ field: 'platform', op: '==', value: platform });
    if (status) filters.push({ field: 'status', op: '==', value: status });
    if (postId) filters.push({ field: 'postId', op: '==', value: postId });

    const comments = await db.query('comments', {
      filters,
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit: Math.min(parseInt(limit as string), 100),
      offset: parseInt(offset as string) || 0,
    });

    res.json({ comments, limit, offset });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/comments/:id - Get comment detail
commentRouter.get('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const comment = await db.get('comments', req.params.id);

    if (!comment || comment.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Comment not found' } });
    }

    res.json(comment);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/comments/:id/status - Update comment status
commentRouter.put('/:id/status', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.body;
    const tenantId = req.user!.tenantId;

    if (!['pending', 'approved', 'rejected', 'spam'].includes(status)) {
      return res.status(400).json({ error: { message: 'Invalid status' } });
    }

    const comment = await db.get('comments', req.params.id);

    if (!comment || comment.tenantId !== tenantId) {
      return res.status(404).json({ error: { message: 'Comment not found' } });
    }

    await db.update('comments', req.params.id, {
      status,
      updatedAt: new Date().toISOString(),
    });

    res.json({ message: 'Comment status updated' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/comments/:id/reply - Post reply to comment
commentRouter.post('/:id/reply', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { text } = req.body;
    const tenantId = req.user!.tenantId;

    if (!text) {
      return res.status(400).json({ error: { message: 'text required' } });
    }

    const comment = await db.get('comments', req.params.id);

    if (!comment || comment.tenantId !== tenantId) {
      return res.status(404).json({ error: { message: 'Comment not found' } });
    }

    // Create reply record
    const replyId = `reply_${uuidv4().slice(0, 8)}`;
    await db.set('comment_replies', replyId, {
      id: replyId,
      tenantId,
      commentId: req.params.id,
      text,
      createdBy: req.user!.uid,
      createdAt: new Date().toISOString(),
      status: 'pending',
    });

    // Publish event for posting reply
    await publishEvent('comment.reply_created', {
      tenantId,
      commentId: req.params.id,
      replyId,
      platform: comment.platform,
      text,
    });

    res.status(201).json({ replyId });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/comments/webhook/:platform - Webhook ingress for platform comments
commentRouter.post('/webhook/:platform', async (req, res, next) => {
  try {
    const { platform } = req.params;

    // Validate webhook signature based on platform
    let isValid = false;

    if (platform === 'instagram' || platform === 'facebook') {
      isValid = validateMetaWebhook(req);
    } else if (platform === 'whatsapp') {
      isValid = validateWhatsAppWebhook(req);
    }

    if (!isValid) {
      return res.status(401).json({ error: { message: 'Invalid signature' } });
    }

    // Extract comment data based on platform
    const commentData = extractCommentData(req.body, platform);

    if (!commentData) {
      return res.status(400).json({ error: { message: 'Invalid webhook data' } });
    }

    // Publish event
    await publishEvent('comment.received', {
      tenantId: commentData.tenantId,
      commentId: commentData.id,
      platform,
      commentData,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/comments/analytics/summary - Get comment analytics
commentRouter.get('/analytics/summary', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const comments = await db.query('comments', {
      filters: [{ field: 'tenantId', op: '==', value: tenantId }],
      limit: 10000,
    });

    const stats = {
      total: comments.length,
      byStatus: {
        pending: comments.filter(c => c.status === 'pending').length,
        approved: comments.filter(c => c.status === 'approved').length,
        rejected: comments.filter(c => c.status === 'rejected').length,
        spam: comments.filter(c => c.status === 'spam').length,
      },
      byPlatform: {} as Record<string, number>,
      avgSentiment: 0,
    };

    comments.forEach(c => {
      stats.byPlatform[c.platform] = (stats.byPlatform[c.platform] || 0) + 1;
    });

    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// Helper functions
function validateMetaWebhook(req: any): boolean {
  const crypto = require('crypto');
  const signature = req.get('X-Hub-Signature-256');

  if (!signature) return false;

  const payload = JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', process.env.META_WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex');

  return signature === `sha256=${hash}`;
}

function validateWhatsAppWebhook(req: any): boolean {
  const crypto = require('crypto');
  const signature = req.get('X-Webhook-Signature');

  if (!signature) return false;

  const payload = JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex');

  return signature === hash;
}

function extractCommentData(body: any, platform: string): any {
  if (platform === 'instagram' || platform === 'facebook') {
    // Meta webhook format
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (value?.comment_id) {
      return {
        id: `comment_${uuidv4().slice(0, 8)}`,
        tenantId: extractTenantIdFromMeta(value),
        platform,
        platformCommentId: value.comment_id,
        platformPostId: value.post_id,
        text: value.text,
        authorId: value.from?.id,
        authorName: value.from?.name,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
    }
  } else if (platform === 'whatsapp') {
    // WhatsApp webhook format
    const message = body.messages?.[0];

    if (message) {
      return {
        id: `comment_${uuidv4().slice(0, 8)}`,
        tenantId: extractTenantIdFromWhatsApp(body),
        platform,
        platformMessageId: message.id,
        text: message.text?.body,
        authorId: message.from,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
    }
  }

  return null;
}

function extractTenantIdFromMeta(value: any): string {
  // TODO: Map Meta business account ID to tenant ID
  return 'tenant_unknown';
}

function extractTenantIdFromWhatsApp(body: any): string {
  // TODO: Map WhatsApp business account ID to tenant ID
  return 'tenant_unknown';
}
