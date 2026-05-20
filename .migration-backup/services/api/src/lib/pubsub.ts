import { v4 as uuidv4 } from 'uuid';
import type { CloudEvent } from '@autobot360/shared';

const eventLog: CloudEvent[] = [];

export async function publishEvent<T>(
  topicName: string,
  event: Omit<CloudEvent<T>, 'eventId' | 'version' | 'timestamp'> & { payload: T }
): Promise<string> {
  const fullEvent: CloudEvent<T> = {
    eventId: uuidv4(),
    eventType: event.eventType,
    version: '1.0',
    timestamp: new Date().toISOString(),
    tenantId: event.tenantId,
    userId: event.userId,
    traceId: event.traceId || uuidv4(),
    idempotencyKey: event.idempotencyKey,
    payload: event.payload,
    metadata: event.metadata,
  };

  // Log events in dev; wire to GCP Pub/Sub in production
  if (process.env.GCP_PROJECT_ID && process.env.USE_DEV_STORE !== 'true') {
    try {
      const { PubSub } = await import('@google-cloud/pubsub');
      const pubsub = new PubSub({ projectId: process.env.GCP_PROJECT_ID });
      const messageId = await pubsub.topic(topicName).publishMessage({
        data: Buffer.from(JSON.stringify(fullEvent)),
        attributes: { eventType: fullEvent.eventType, tenantId: fullEvent.tenantId },
      });
      return messageId;
    } catch (err) {
      console.warn('Pub/Sub publish failed, logging locally:', err);
    }
  }

  eventLog.push(fullEvent);
  if (process.env.NODE_ENV === 'development') {
    console.log(`[event] ${topicName}`, fullEvent.eventType, fullEvent.tenantId);
  }

  // n8n automation is optional — when disabled, publish via direct API
  if (process.env.DISABLE_N8N_AUTO_DISPATCH === 'true') {
    if (fullEvent.eventType === 'publish.requested') {
      const payload = fullEvent.payload as { scheduledPostId?: string; scheduledAt?: string };
      if (payload?.scheduledPostId) {
        import('../agents/publish/publish-executor')
          .then(({ enqueueScheduledPost }) =>
            enqueueScheduledPost(
              payload.scheduledPostId!,
              payload.scheduledAt || new Date().toISOString()
            )
          )
          .catch((err) => console.warn('[publish] enqueue failed:', err));
      }
    }
    return fullEvent.eventId;
  }

  const workflowMap: Record<string, string> = {
    'publish.requested': 'publish-product',
    'comment.received': 'comment-monitoring',
    'payment.success': 'razorpay-payment',
    'order.created': 'order-creation',
    'token.expiring': 'token-refresh',
    'analytics.sync': 'analytics-sync',
  };
  const workflow = workflowMap[fullEvent.eventType];
  if (workflow && fullEvent.tenantId) {
    import('../agents/orchestration/n8n-service')
      .then(({ dispatchToN8n }) => dispatchToN8n(fullEvent.tenantId, workflow, fullEvent as unknown as Record<string, unknown>))
      .catch((err) => console.warn('[n8n] dispatch skipped:', err));
  }

  return fullEvent.eventId;
}

export function getEventLog() {
  return eventLog;
}
