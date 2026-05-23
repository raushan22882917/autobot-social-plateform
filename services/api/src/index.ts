import dotenv from 'dotenv';
import path from 'path';
import express from 'express';

// Always load services/api/.env (npm workspace cwd can be repo root)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRouter } from './agents/auth/routes';
import { dashboardRouter } from './agents/dashboard/routes';
import { productRouter } from './agents/product/routes';
import { socialRouter } from './agents/social-connect/routes';
import { socialOAuthRouter } from './agents/social-connect/oauth-routes';
import { publishRouter } from './agents/publish/routes';
import { paymentRouter } from './agents/payment/routes';
import { orderRouter } from './agents/order/routes';
import { checkoutRouter } from './agents/checkout/routes';
import { analyticsRouter } from './agents/analytics/routes';
import { notificationRouter } from './agents/notification/routes';
import { studioRouter } from './agents/studio/routes';
import { teamRouter } from './agents/team/routes';
import { platformAdminRouter } from './agents/platform-admin/routes';
import { aiSalesRouter } from './agents/ai-sales/routes';
import { commentRouter } from './agents/comment-monitor/routes';
import { gdprRouter } from './agents/gdpr/routes';
import { auditRouter } from './agents/audit/routes';
import { mfaRouter } from './agents/auth/mfa-routes';
import { apiKeysRouter } from './agents/settings/api-keys-routes';
import { internalRouter } from './internal/routes';
import { publicRouter } from './routes/public';
import { webhooksRouter } from './routes/webhooks';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { assertFirestoreReady, getStorageMode, isDevStore } from './lib/db';
import { hasValidServiceAccount } from './lib/firebase-admin';
import { processDueScheduledPosts } from './agents/publish/publish-executor';
import { reloadApiEnv } from './lib/env';
import { isGcpPubSubEnabled } from './lib/pubsub';
import { SOCIAL_PLATFORMS, isPlatformOAuthReady } from './agents/social-connect/config';

const app = express();
const PORT = process.env.PORT || 8081;

app.use(
  helmet({
    // Allow Firebase/Google OAuth popups to communicate with the opener in dev
    crossOriginOpenerPolicy:
      process.env.NODE_ENV === 'production' ? { policy: 'same-origin' } : { policy: 'same-origin-allow-popups' },
  })
);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Dev: allow any localhost port (e.g. 3001 when 3000 is taken)
      if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT || '300', 10),
  standardHeaders: true,
}));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'autobot360-api',
    version: '1.0.0',
    storage: getStorageMode(),
    firestoreReady: isDevStore() || hasValidServiceAccount(),
    mode: isDevStore() ? 'development' : 'production',
  });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/auth/mfa', mfaRouter);
app.use('/api/v1/checkout', checkoutRouter);
app.use('/api/v1/public', publicRouter);
app.use('/api/v1/webhooks', webhooksRouter);
app.use('/api/v1/social/oauth', socialOAuthRouter);

app.use('/api/v1/dashboard', authMiddleware, dashboardRouter);
app.use('/api/v1/products', authMiddleware, productRouter);
app.use('/api/v1/social', authMiddleware, socialRouter);
app.use('/api/v1/publish', authMiddleware, publishRouter);
app.use('/api/v1/payments', paymentRouter);
app.use('/api/v1/orders', authMiddleware, orderRouter);
app.use('/api/v1/analytics', authMiddleware, analyticsRouter);
app.use('/api/v1/notifications', authMiddleware, notificationRouter);
app.use('/api/v1/studio', authMiddleware, studioRouter);
app.use('/api/v1/team', teamRouter);
app.use('/api/v1/platform', platformAdminRouter);
app.use('/api/v1/ai-sales', authMiddleware, aiSalesRouter);
app.use('/api/v1/comments', commentRouter);
app.use('/api/v1/gdpr', authMiddleware, gdprRouter);
app.use('/api/v1/audit', authMiddleware, auditRouter);
app.use('/api/v1/settings/api-keys', apiKeysRouter);

app.use('/internal', internalRouter);

app.use(errorHandler);

async function start() {
  if (!isDevStore()) {
    try {
      await assertFirestoreReady();
      console.log(`Firestore connected (${process.env.FIREBASE_PROJECT_ID || 'autobot-founder'})`);
    } catch (err) {
      console.error(err instanceof Error ? err.message : 'Firestore connection failed');
      console.error(
        'Regenerate firebase-service-account.json: Firebase Console → Service accounts → Generate new private key. ' +
          'Then run: npm run firebase:check'
      );
      process.exit(1);
    }
  }

  const server = app.listen(PORT, () => {
    console.log(`AutoBot360 API → http://localhost:${PORT}`);
    console.log(
      `Storage: ${isDevStore() ? 'in-memory (USE_DEV_STORE=true)' : 'Firestore (cloud)'}`
    );
    reloadApiEnv();
    const socialReady = SOCIAL_PLATFORMS.filter((p) => isPlatformOAuthReady(p));
    console.log(
      `Social OAuth ready: ${socialReady.length ? socialReady.join(', ') : 'none (add keys to services/api/.env)'}`
    );
    const intervalMs = parseInt(process.env.PUBLISH_POLL_INTERVAL_MS || '30000', 10);
    console.log(
      `Events: ${isGcpPubSubEnabled() ? 'Cloud Pub/Sub' : 'in-process (PUBSUB_ENABLED=false)'}`
    );
    console.log(`Publish: direct API (poll every ${intervalMs}ms)`);
    setInterval(() => {
      void processDueScheduledPosts().then((n) => {
        if (n > 0) console.log(`[publish] processed ${n} due post(s)`);
      });
    }, intervalMs);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is already in use. Stop the other API process: lsof -ti:${PORT} | xargs kill -9`
      );
      process.exit(1);
    }
    throw err;
  });
}

void start();

export default app;
