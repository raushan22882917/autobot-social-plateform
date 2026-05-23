import { v4 as uuidv4 } from 'uuid';
import type { CloudEvent } from '@autobot360/shared';

const eventLog: CloudEvent[] = [];

/** GCP Pub/Sub is opt-in — local dev uses in-process handlers (no topics required). */
export function isGcpPubSubEnabled(): boolean {
  return (
    process.env.PUBSUB_ENABLED === 'true' &&
    Boolean(process.env.GCP_PROJECT_ID) &&
    process.env.USE_DEV_STORE !== 'true'
  );
}

function pubsubErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'details' in err && typeof (err as { details?: string }).details === 'string') {
    return (err as { details: string }).details;
  }
  return err instanceof Error ? err.message : String(err);
}

async function runLocalPublishRequestedHandler(payload: {
  scheduledPostId?: string;
  scheduledAt?: string;
}): Promise<void> {
  if (!payload?.scheduledPostId) return;
  const { enqueueScheduledPost } = await import('../agents/publish/publish-executor');
  await enqueueScheduledPost(payload.scheduledPostId, payload.scheduledAt || new Date().toISOString());
}

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

  if (isGcpPubSubEnabled()) {
    try {
      const { PubSub } = await import('@google-cloud/pubsub');
      const pubsub = new PubSub({ projectId: process.env.GCP_PROJECT_ID });
      const messageId = await pubsub.topic(topicName).publishMessage({
        data: Buffer.from(JSON.stringify(fullEvent)),
        attributes: { eventType: fullEvent.eventType, tenantId: fullEvent.tenantId },
      });
      return messageId;
    } catch (err) {
      const code = (err as { code?: number }).code;
      const msg = pubsubErrorMessage(err);
      if (code === 5) {
        console.warn(
          `[pubsub] Topic "${topicName}" not found in GCP — using in-process handler. ` +
            'Create the topic in Cloud Pub/Sub or set PUBSUB_ENABLED=false in services/api/.env.'
        );
      } else {
        console.warn(`[pubsub] Publish to "${topicName}" failed — using in-process handler: ${msg}`);
      }
    }
  }

  eventLog.push(fullEvent);
  if (process.env.NODE_ENV === 'development') {
    console.log(`[event] ${topicName}`, fullEvent.eventType, fullEvent.tenantId);
  }

  if (fullEvent.eventType === 'publish.requested') {
    const payload = fullEvent.payload as { scheduledPostId?: string; scheduledAt?: string };
    void runLocalPublishRequestedHandler(payload).catch((err) =>
      console.warn('[publish] enqueue failed:', err instanceof Error ? err.message : err)
    );
  }

  return fullEvent.eventId;
}

export function getEventLog() {
  return eventLog;
}
