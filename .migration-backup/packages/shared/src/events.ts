export const PubSubTopics = {
  TENANT_CREATED: 'autobot360.tenant.created',
  PRODUCT_CREATED: 'autobot360.product.created',
  PUBLISH_REQUESTED: 'autobot360.publish.requested',
  PUBLISH_COMPLETED: 'autobot360.publish.completed',
  PUBLISH_FAILED: 'autobot360.publish.failed',
  COMMENT_RECEIVED: 'autobot360.comment.received',
  LEAD_CAPTURED: 'autobot360.lead.captured',
  CHECKOUT_STARTED: 'autobot360.checkout.started',
  PAYMENT_SUCCESS: 'autobot360.payment.success',
  PAYMENT_FAILED: 'autobot360.payment.failed',
  ORDER_CREATED: 'autobot360.order.created',
  TOKEN_EXPIRING: 'autobot360.token.expiring',
  ANALYTICS_SYNC: 'autobot360.analytics.sync',
  NOTIFICATION_SEND: 'autobot360.notification.send',
  DLQ: 'autobot360.dlq',
} as const;

export type EventType = typeof PubSubTopics[keyof typeof PubSubTopics];

export interface CloudEvent<T = unknown> {
  eventId: string;
  eventType: string;
  version: '1.0';
  timestamp: string;
  tenantId: string;
  userId?: string;
  traceId: string;
  idempotencyKey: string;
  payload: T;
  metadata?: {
    source: string;
    correlationId?: string;
  };
}

export interface PublishRequestedPayload {
  scheduledPostId: string;
  productId: string;
  platforms: string[];
  socialAccountIds: string[];
  useAiCaption: boolean;
  scheduledAt: string;
}

export interface CommentReceivedPayload {
  platform: string;
  platformPostId: string;
  platformCommentId: string;
  authorUsername: string;
  text: string;
  timestamp: string;
}

export interface PaymentSuccessPayload {
  paymentId: string;
  razorpayPaymentId: string;
  checkoutSessionId: string;
  amount: number;
  currency: 'INR';
}
