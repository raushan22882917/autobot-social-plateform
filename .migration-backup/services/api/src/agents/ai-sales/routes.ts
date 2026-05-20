import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import { authMiddleware, requireRole, type AuthRequest } from '../../middleware/auth';
import { publishEvent } from '../../lib/pubsub';

export const aiSalesRouter = Router();

// POST /api/v1/ai-sales/chat - Process message and generate AI reply
aiSalesRouter.post('/chat', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { conversationId, message, platform } = req.body;
    const tenantId = req.user!.tenantId;

    if (!conversationId || !message) {
      return res.status(400).json({ error: { message: 'conversationId and message required' } });
    }

    // Get or create conversation
    let conversation = await db.get('conversations', conversationId);

    if (!conversation) {
      conversation = {
        id: conversationId,
        tenantId,
        platform,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    if (conversation.tenantId !== tenantId) {
      return res.status(403).json({ error: { message: 'Unauthorized' } });
    }

    // Get products for context
    const products = await db.query('products', {
      filters: [{ field: 'tenantId', op: '==', value: tenantId }],
      limit: 10,
    });

    // Get AI settings
    const subscription = await db.get('subscriptions', tenantId);
    const aiSettings = subscription?.aiSettings || {};

    // Build context for AI
    const context = {
      storeName: subscription?.storeName || 'Our Store',
      tone: aiSettings.tone || 'friendly',
      products: products.map(p => ({
        id: p.id,
        title: p.title,
        price: p.price,
        description: p.description,
      })),
      conversationHistory: conversation.messages.slice(-10), // Last 10 messages
    };

    // Generate AI reply (using Gemini)
    const aiReply = await generateAIReply(message, context);

    // Save messages to conversation
    conversation.messages.push(
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: aiReply, timestamp: new Date().toISOString() }
    );

    conversation.updatedAt = new Date().toISOString();

    await db.set('conversations', conversationId, conversation);

    // Create AI reply record
    const replyId = `reply_${uuidv4().slice(0, 8)}`;
    await db.set('ai_replies', replyId, {
      id: replyId,
      tenantId,
      conversationId,
      message,
      reply: aiReply,
      platform,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    // Publish event
    await publishEvent('ai_sales.reply_generated', {
      tenantId,
      conversationId,
      replyId,
      platform,
    });

    res.json({
      conversationId,
      reply: aiReply,
      replyId,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/ai-sales/conversations - List conversations
aiSalesRouter.get('/conversations', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { platform, limit = 50, offset = 0 } = req.query;
    const tenantId = req.user!.tenantId;

    const filters: any[] = [{ field: 'tenantId', op: '==', value: tenantId }];

    if (platform) filters.push({ field: 'platform', op: '==', value: platform });

    const conversations = await db.query('conversations', {
      filters,
      orderBy: { field: 'updatedAt', direction: 'desc' },
      limit: Math.min(parseInt(limit as string), 100),
      offset: parseInt(offset as string) || 0,
    });

    res.json({
      conversations: conversations.map(c => ({
        id: c.id,
        platform: c.platform,
        messageCount: c.messages?.length || 0,
        lastMessage: c.messages?.[c.messages.length - 1]?.content,
        updatedAt: c.updatedAt,
      })),
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/ai-sales/conversations/:id - Get conversation detail
aiSalesRouter.get('/conversations/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const conversation = await db.get('conversations', req.params.id);

    if (!conversation || conversation.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Conversation not found' } });
    }

    res.json(conversation);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/ai-sales/settings - Update AI settings
aiSalesRouter.put('/settings', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const { tone, autoReplyEnabled, rules } = req.body;
    const tenantId = req.user!.tenantId;

    const subscription = await db.get('subscriptions', tenantId);

    if (!subscription) {
      return res.status(404).json({ error: { message: 'Subscription not found' } });
    }

    const aiSettings = {
      tone: tone || subscription.aiSettings?.tone || 'friendly',
      autoReplyEnabled: autoReplyEnabled !== undefined ? autoReplyEnabled : subscription.aiSettings?.autoReplyEnabled || false,
      rules: rules || subscription.aiSettings?.rules || [],
      updatedAt: new Date().toISOString(),
    };

    await db.update('subscriptions', tenantId, { aiSettings });

    res.json({ message: 'Settings updated', aiSettings });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/ai-sales/settings - Get AI settings
aiSalesRouter.get('/settings', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const subscription = await db.get('subscriptions', tenantId);

    if (!subscription) {
      return res.status(404).json({ error: { message: 'Subscription not found' } });
    }

    res.json({
      aiSettings: subscription.aiSettings || {
        tone: 'friendly',
        autoReplyEnabled: false,
        rules: [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/ai-sales/analytics - Get AI sales analytics
aiSalesRouter.get('/analytics', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const replies = await db.query('ai_replies', {
      filters: [{ field: 'tenantId', op: '==', value: tenantId }],
      limit: 10000,
    });

    const stats = {
      totalReplies: replies.length,
      byStatus: {
        pending: replies.filter(r => r.status === 'pending').length,
        sent: replies.filter(r => r.status === 'sent').length,
        failed: replies.filter(r => r.status === 'failed').length,
      },
      byPlatform: {} as Record<string, number>,
      avgResponseTime: 0,
    };

    replies.forEach(r => {
      stats.byPlatform[r.platform] = (stats.byPlatform[r.platform] || 0) + 1;
    });

    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// Helper function to generate AI reply
async function generateAIReply(message: string, context: any): Promise<string> {
  // TODO: Integrate with Gemini API
  // For now, return a placeholder response

  const systemPrompt = `You are a helpful sales assistant for ${context.storeName}. 
Your tone should be ${context.tone}.
Available products: ${context.products.map(p => `${p.title} (₹${p.price})`).join(', ')}

Respond helpfully to customer inquiries about products, pricing, and availability.
Keep responses concise and friendly.`;

  // This would call Gemini API in production
  // const response = await gemini.generateContent({
  //   systemPrompt,
  //   userMessage: message,
  //   conversationHistory: context.conversationHistory,
  // });

  // Placeholder response
  return `Thank you for your interest! I'd be happy to help you find the perfect product. What are you looking for?`;
}
