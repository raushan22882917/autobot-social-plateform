import { z } from 'zod';

export const createProductSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000),
  price: z.number().positive(),
  sku: z.string().min(1),
  inventory: z.number().int().min(0),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string(),
    order: z.number().int(),
  })).optional(),
});

export const youtubePrivacySchema = z.enum(['private', 'unlisted', 'public']);

export const schedulePostSchema = z.object({
  productId: z.string().min(1),
  platforms: z.array(z.enum(['instagram', 'facebook', 'youtube', 'whatsapp'])).min(1),
  socialAccountIds: z.array(z.string()).default([]),
  scheduledAt: z.string().datetime(),
  useAiCaption: z.boolean().default(true),
  caption: z.string().max(2200).optional(),
  hashtags: z.array(z.string()).optional(),
  youtubePrivacy: youtubePrivacySchema.optional(),
});

export const createCheckoutSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().positive().default(1),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});
